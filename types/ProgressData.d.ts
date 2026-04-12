export interface ProgressRoleGroup {
    id: string;
    roleId: string | null;
    roleName: string;
    memberIds: string[];
    depth: number;
    parentId: string | null;
    lastSyncedAt: string;
}

export interface ProgressData {
    channelId: string | null;
    currentMainGroup: number;
    foundLoggers: string[];
    startTime: string;
    lastUpdate: string;
    roleGroups: ProgressRoleGroup[];
    legitUsers: string[];
}

export interface LegacyProgressData extends Partial<ProgressData> {
    group?: string[][];
}
