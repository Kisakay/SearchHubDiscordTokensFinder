export interface GuildSettingsRecord {
    id: string;
    prefix: string;
    createdAt: string;
    updatedAt: string;
}

export interface OwnerRecord {
    id: string;
    addedAt: string;
    addedBy: string;
}

export interface SearchHubCredentialsRecord {
    id: string;
    selfbotToken: string | null;
    searchBaseUrl: string;
    updatedAt: string;
    updatedBy: string;
}

export interface ProgressRoleGroup {
    id: string;
    roleId: string | null;
    roleName: string;
    memberIds: string[];
    depth: number;
    parentId: string | null;
    lastSyncedAt: string;
}

export interface SearchProgress {
    channelId: string | null;
    currentMainGroup: number;
    foundLoggers: string[];
    startTime: string;
    lastUpdate: string;
    roleGroups: ProgressRoleGroup[];
    legitUsers: string[];
}

export type SearchRunStatus = "running" | "paused";

export interface SearchRunRecord {
    id: string;
    announceChannelId: string;
    status: SearchRunStatus;
    progress: SearchProgress;
    startedBy: string;
    startedAt: string;
    updatedAt: string;
    lastError: string | null;
}

export interface SearchHubMessage {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    content: string;
}
