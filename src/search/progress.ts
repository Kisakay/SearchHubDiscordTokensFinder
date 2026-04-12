import type {
    ProgressRoleGroup,
    SearchProgress
} from "../types/database";

function uniqueIds(ids: string[]): string[] {
    return [...new Set(ids.filter(Boolean))];
}

export const GROUP_ROLE_NAME_PREFIX = "Batch #";

export function getParentGroupId(groupId: string): string | null {
    const separatorIndex = groupId.lastIndexOf("_");
    if (separatorIndex === -1) {
        return null;
    }

    return groupId.slice(0, separatorIndex);
}

export function buildRoleName(groupId: string): string {
    return `${GROUP_ROLE_NAME_PREFIX}${groupId}`.slice(0, 100);
}

export function getRootGroupId(groupId: string): string {
    const separatorIndex = groupId.indexOf("_");
    if (separatorIndex === -1) {
        return groupId;
    }

    return groupId.slice(0, separatorIndex);
}

export function isSameOrAncestorGroup(candidateGroupId: string, groupId: string): boolean {
    return candidateGroupId === groupId || groupId.startsWith(`${candidateGroupId}_`);
}

export function areGroupsCompatible(firstGroupId: string, secondGroupId: string): boolean {
    return isSameOrAncestorGroup(firstGroupId, secondGroupId)
        || isSameOrAncestorGroup(secondGroupId, firstGroupId);
}

function normalizeRoleGroup(group: Partial<ProgressRoleGroup>, index: number): ProgressRoleGroup {
    const now = new Date().toISOString();
    const fallbackId = group.id ?? `LEGACY_${index + 1}`;

    return {
        id: fallbackId,
        roleId: group.roleId ?? null,
        roleName: group.roleName ?? buildRoleName(fallbackId),
        memberIds: uniqueIds(group.memberIds ?? []),
        depth: group.depth ?? fallbackId.split("_").length - 1,
        parentId: group.parentId ?? getParentGroupId(fallbackId),
        lastSyncedAt: group.lastSyncedAt ?? now
    };
}

export function normalizeProgress(data: SearchProgress): SearchProgress {
    const now = new Date().toISOString();

    return {
        channelId: data.channelId ?? null,
        currentMainGroup: typeof data.currentMainGroup === "number" ? data.currentMainGroup : 0,
        foundLoggers: uniqueIds(data.foundLoggers ?? []),
        startTime: data.startTime ?? now,
        lastUpdate: data.lastUpdate ?? now,
        roleGroups: Array.isArray(data.roleGroups)
            ? data.roleGroups.map((group, index) => normalizeRoleGroup(group, index))
            : [],
        legitUsers: uniqueIds(data.legitUsers ?? [])
    };
}

export function getRoleGroup(progress: SearchProgress, groupId: string): ProgressRoleGroup | undefined {
    return progress.roleGroups.find(group => group.id === groupId);
}

export function getMainRoleGroups(progress: SearchProgress): ProgressRoleGroup[] {
    return progress.roleGroups
        .filter(group => group.depth === 0)
        .sort((first, second) => first.id.localeCompare(second.id, undefined, { numeric: true }));
}

export function getActiveRoleGroups(progress: SearchProgress): ProgressRoleGroup[] {
    return progress.roleGroups
        .filter(group => group.memberIds.length > 0)
        .sort((first, second) => {
            if (first.depth !== second.depth) {
                return second.depth - first.depth;
            }

            return first.id.localeCompare(second.id, undefined, { numeric: true });
        });
}

export function assignMembersToGroup(
    progress: SearchProgress,
    groupId: string,
    memberIds: string[],
    depth: number
): ProgressRoleGroup {
    const nextMemberIds = uniqueIds(memberIds);
    const removedMembers = new Set(nextMemberIds);
    const now = new Date().toISOString();

    progress.roleGroups = progress.roleGroups.map(group => {
        if (group.id === groupId || areGroupsCompatible(group.id, groupId)) {
            return group;
        }

        const filteredMemberIds = group.memberIds.filter(memberId => !removedMembers.has(memberId));
        if (filteredMemberIds.length === group.memberIds.length) {
            return group;
        }

        return {
            ...group,
            memberIds: filteredMemberIds,
            lastSyncedAt: now
        };
    });

    return upsertRoleGroup(progress, {
        id: groupId,
        depth,
        parentId: getParentGroupId(groupId),
        roleName: buildRoleName(groupId),
        memberIds: nextMemberIds
    });
}

export function upsertRoleGroup(
    progress: SearchProgress,
    partialGroup: Partial<ProgressRoleGroup> & Pick<ProgressRoleGroup, "id">
): ProgressRoleGroup {
    const now = new Date().toISOString();
    const existingGroup = getRoleGroup(progress, partialGroup.id);
    const group = normalizeRoleGroup({
        ...existingGroup,
        ...partialGroup,
        memberIds: partialGroup.memberIds ?? existingGroup?.memberIds ?? [],
        lastSyncedAt: now
    }, progress.roleGroups.length);

    progress.roleGroups = progress.roleGroups.filter(existing => existing.id !== group.id);
    progress.roleGroups.push(group);
    progress.lastUpdate = now;

    return group;
}

export function markLegitUsers(progress: SearchProgress, memberIds: string[]): void {
    progress.legitUsers = uniqueIds([...progress.legitUsers, ...memberIds]);
    progress.lastUpdate = new Date().toISOString();
}

export function markFoundLogger(progress: SearchProgress, memberId: string): void {
    progress.foundLoggers = uniqueIds([...progress.foundLoggers, memberId]);
    progress.lastUpdate = new Date().toISOString();
}

export function createNewProgress(channelId: string | null): SearchProgress {
    const now = new Date().toISOString();
    return {
        channelId,
        currentMainGroup: 0,
        foundLoggers: [],
        startTime: now,
        lastUpdate: now,
        roleGroups: [],
        legitUsers: []
    };
}
