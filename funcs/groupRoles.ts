import type { Guild, GuildMember, Role } from "discord.js";

import type { ProgressData, ProgressRoleGroup } from "../types/ProgressData";
import {
    buildRoleName,
    getParentGroupId,
    saveProgress,
    upsertRoleGroup
} from "./progress";

export const MAIN_GROUP_SIZE = 200;

export async function ensureGroupRole(
    guild: Guild,
    progress: ProgressData,
    groupId: string,
    depth: number
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

    saveProgress(progress);
    return { group, role };
}

export async function syncMembersWithGroupRole(
    guild: Guild,
    progress: ProgressData,
    groupId: string,
    members: GuildMember[],
    depth: number,
    indent: string = ""
): Promise<{ group: ProgressRoleGroup; role: Role }> {
    const memberIds = members.map(member => member.id);

    upsertRoleGroup(progress, {
        id: groupId,
        depth,
        parentId: getParentGroupId(groupId),
        roleName: buildRoleName(groupId),
        memberIds
    });

    const { role } = await ensureGroupRole(guild, progress, groupId, depth);

    if (members.length > 0) {
        console.log(`${indent}👥 Synchronisation du rôle ${role.name} sur ${members.length} membre(s)...`);
    }

    for (const member of members) {
        if (member.roles.cache.has(role.id)) {
            continue;
        }

        try {
            await member.roles.add(role);
        } catch {
            console.error(`${indent}⚠️  Erreur ajout rôle à ${member.user.tag}`);
        }
    }

    const group = upsertRoleGroup(progress, {
        id: groupId,
        depth,
        parentId: getParentGroupId(groupId),
        roleId: role.id,
        roleName: role.name,
        memberIds
    });

    saveProgress(progress);
    return { group, role };
}
