import type { Guild, GuildMember, Role } from "discord.js";

import type { ProgressRoleGroup, SearchProgress } from "../types/database";
import {
    areGroupsCompatible,
    assignMembersToGroup,
    buildRoleName,
    GROUP_ROLE_NAME_PREFIX,
    getParentGroupId,
    upsertRoleGroup
} from "./progress";

function getBatchGroupIdForRole(progress: SearchProgress, role: Role): string | null {
    const savedGroup = progress.roleGroups.find(group => group.roleId === role.id);
    if (savedGroup) {
        return savedGroup.id;
    }

    if (!role.name.startsWith(GROUP_ROLE_NAME_PREFIX)) {
        return null;
    }

    return role.name.slice(GROUP_ROLE_NAME_PREFIX.length).trim() || null;
}

export async function ensureGroupRole(
    guild: Guild,
    progress: SearchProgress,
    groupId: string,
    depth: number,
    persistProgress: () => Promise<void>
): Promise<{ group: ProgressRoleGroup; role: Role }> {
    const roleName = buildRoleName(groupId);

    let group = upsertRoleGroup(progress, {
        id: groupId,
        depth,
        parentId: getParentGroupId(groupId),
        roleName
    });

    let role: Role | null = null;

    if (group.roleId) {
        role = await guild.roles.fetch(group.roleId).catch(() => null);
    }

    if (!role) {
        const roles = await guild.roles.fetch();
        role = roles.find(existingRole => existingRole.name === roleName) ?? null;
    }

    if (!role) {
        role = await guild.roles.create({
            name: roleName,
            permissions: []
        });
    } else if (role.name !== roleName) {
        role = await role.edit({ name: roleName });
    }

    group = upsertRoleGroup(progress, {
        id: groupId,
        depth,
        parentId: group.parentId ?? getParentGroupId(groupId),
        roleId: role.id,
        roleName: role.name
    });

    await persistProgress();
    return { group, role };
}

export async function syncMembersWithGroupRole(
    guild: Guild,
    progress: SearchProgress,
    groupId: string,
    members: GuildMember[],
    depth: number,
    persistProgress: () => Promise<void>,
    indent: string = ""
): Promise<{ group: ProgressRoleGroup; role: Role }> {
    const memberIds = members.map(member => member.id);
    const knownGroupRoleIds = new Set(
        progress.roleGroups
            .map(group => group.roleId)
            .filter((roleId): roleId is string => Boolean(roleId))
    );

    assignMembersToGroup(progress, groupId, memberIds, depth);

    const { role } = await ensureGroupRole(guild, progress, groupId, depth, persistProgress);

    if (members.length > 0) {
        console.log(`${indent}👥 Vérification du rôle ${role.name} sur ${members.length} membre(s)...`);
    }

    let addedRolesCount = 0;
    let removedRolesCount = 0;
    let unchangedMembersCount = 0;

    for (const member of members) {
        const rolesToRemove = member.roles.cache
            .filter(existingRole => {
                if (existingRole.id === role.id) {
                    return false;
                }

                if (
                    !knownGroupRoleIds.has(existingRole.id)
                    && !existingRole.name.startsWith(GROUP_ROLE_NAME_PREFIX)
                ) {
                    return false;
                }

                const existingGroupId = getBatchGroupIdForRole(progress, existingRole);
                if (!existingGroupId) {
                    return true;
                }

                return !areGroupsCompatible(existingGroupId, groupId);
            })
            .map(existingRole => existingRole);

        const hadTargetRole = member.roles.cache.has(role.id);

        if (rolesToRemove.length > 0) {
            try {
                await member.roles.remove(rolesToRemove);
                removedRolesCount += rolesToRemove.length;
            } catch {
                console.error(`${indent}⚠️ Erreur suppression anciens rôles à ${member.user.tag}`);
            }
        }

        if (!hadTargetRole) {
            try {
                await member.roles.add(role);
                addedRolesCount += 1;
            } catch {
                console.error(`${indent}⚠️ Erreur ajout rôle à ${member.user.tag}`);
            }
        } else if (rolesToRemove.length === 0) {
            unchangedMembersCount += 1;
        }
    }

    if (members.length > 0) {
        console.log(
            `${indent}📊 Vérification terminée: ${addedRolesCount} ajout(s), ${removedRolesCount} retrait(s), ${unchangedMembersCount} inchangé(s)`
        );
    }

    const group = assignMembersToGroup(progress, groupId, memberIds, depth);
    upsertRoleGroup(progress, {
        id: groupId,
        depth,
        parentId: getParentGroupId(groupId),
        roleId: role.id,
        roleName: role.name,
        memberIds: group.memberIds
    });

    await persistProgress();
    return { group, role };
}
