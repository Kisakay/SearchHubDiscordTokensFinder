import * as path from 'path';
import * as fs from 'fs';

import type {
    LegacyProgressData,
    ProgressData,
    ProgressRoleGroup
} from "../types/ProgressData";

const PROGRESS_FILE = path.join(__dirname, '..', 'detection_progress.json');

function uniqueIds(ids: string[]): string[] {
    return [...new Set(ids.filter(Boolean))];
}

export const GROUP_ROLE_NAME_PREFIX = 'SearchHub Group ';

export function getParentGroupId(groupId: string): string | null {
    const separatorIndex = groupId.lastIndexOf('_');
    if (separatorIndex === -1) {
        return null;
    }

    return groupId.slice(0, separatorIndex);
}

export function buildRoleName(groupId: string): string {
    return `${GROUP_ROLE_NAME_PREFIX}${groupId}`.slice(0, 100);
}

export function getRootGroupId(groupId: string): string {
    const separatorIndex = groupId.indexOf('_');
    if (separatorIndex === -1) {
        return groupId;
    }

    return groupId.slice(0, separatorIndex);
}

function normalizeRoleGroup(group: Partial<ProgressRoleGroup>, index: number): ProgressRoleGroup {
    const now = new Date().toISOString();
    const fallbackId = group.id ?? `LEGACY_${index + 1}`;

    return {
        id: fallbackId,
        roleId: group.roleId ?? null,
        roleName: group.roleName ?? buildRoleName(fallbackId),
        memberIds: uniqueIds(group.memberIds ?? []),
        depth: group.depth ?? fallbackId.split('_').length - 1,
        parentId: group.parentId ?? getParentGroupId(fallbackId),
        lastSyncedAt: group.lastSyncedAt ?? now
    };
}

function normalizeProgress(data: LegacyProgressData): ProgressData {
    const now = new Date().toISOString();
    const legacyGroups = Array.isArray(data.group)
        ? data.group.map((memberIds, index) => normalizeRoleGroup({
            id: `LEGACY_${index + 1}`,
            memberIds
        }, index))
        : [];

    const roleGroups = Array.isArray(data.roleGroups)
        ? data.roleGroups.map((group, index) => normalizeRoleGroup(group, index))
        : legacyGroups;

    return {
        channelId: data.channelId ?? null,
        currentMainGroup: typeof data.currentMainGroup === 'number' ? data.currentMainGroup : 0,
        foundLoggers: uniqueIds(data.foundLoggers ?? []),
        startTime: data.startTime ?? now,
        lastUpdate: data.lastUpdate ?? now,
        roleGroups,
        legitUsers: uniqueIds(data.legitUsers ?? [])
    };
}

export function loadProgress(): ProgressData | null {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
            return normalizeProgress(JSON.parse(data) as LegacyProgressData);
        }
    } catch (error) {
        console.error('[LOAD ERROR]', error);
    }
    return null;
}

export function clearProgress(): void {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            fs.unlinkSync(PROGRESS_FILE);
            console.log('[CLEAR] Progression effacée');
        }
    } catch (error) {
        console.error('[CLEAR ERROR]', error);
    }
}

export function saveProgress(data: ProgressData): void {
    try {
        const normalized = normalizeProgress(data);
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
        console.log(`[SAVE] Progression sauvegardée`);
    } catch (error) {
        console.error('[SAVE ERROR]', error);
    }
}

export function getRoleGroup(progress: ProgressData, groupId: string): ProgressRoleGroup | undefined {
    return progress.roleGroups.find(group => group.id === groupId);
}

export function getMainRoleGroups(progress: ProgressData): ProgressRoleGroup[] {
    return progress.roleGroups
        .filter(group => group.depth === 0)
        .sort((first, second) => first.id.localeCompare(second.id, undefined, { numeric: true }));
}

export function getActiveRoleGroups(progress: ProgressData): ProgressRoleGroup[] {
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
    progress: ProgressData,
    groupId: string,
    memberIds: string[],
    depth: number
): ProgressRoleGroup {
    const nextMemberIds = uniqueIds(memberIds);
    const removedMembers = new Set(nextMemberIds);
    const now = new Date().toISOString();

    progress.roleGroups = progress.roleGroups.map(group => {
        if (group.id === groupId) {
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
    progress: ProgressData,
    partialGroup: Partial<ProgressRoleGroup> & Pick<ProgressRoleGroup, 'id'>
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

export function markLegitUsers(progress: ProgressData, memberIds: string[]): void {
    progress.legitUsers = uniqueIds([...progress.legitUsers, ...memberIds]);
    progress.lastUpdate = new Date().toISOString();
}

export function markFoundLogger(progress: ProgressData, memberId: string): void {
    progress.foundLoggers = uniqueIds([...progress.foundLoggers, memberId]);
    progress.lastUpdate = new Date().toISOString();
}

export function createNewProgress(channelId: string): ProgressData {
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

export function ensureProgress(data: ProgressData | null, channelId: string): ProgressData {
    if (data) {
        if (!data.channelId) {
            data.channelId = channelId;
        }

        return normalizeProgress(data);
    }

    return createNewProgress(channelId);
}
