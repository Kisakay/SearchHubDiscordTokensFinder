export interface ProgressData {
    channelId: string | null;
    currentMainGroup: number;
    foundLoggers: string[];
    startTime: string;
    lastUpdate: string;
    group: string[][];
    legitUsers: string[];
    roleIds?: string[]; // IDs des rôles réutilisables
}
