import { mkdir } from "node:fs/promises";
import path from "node:path";

import { SquirrelDB } from "squirreldb";

import type { AppEnv } from "../config/env";
import type {
    GuildSettingsRecord,
    OwnerRecord,
    SearchHubCredentialsRecord,
    SearchProgress,
    SearchRunRecord,
    SearchRunStatus
} from "../types/database";

const SEARCHHUB_RECORD_ID = "default";

export class BotDatabase {
    private readonly db: SquirrelDB;
    private readonly defaultPrefix: string;

    constructor(private readonly env: AppEnv) {
        this.defaultPrefix = env.defaultPrefix;
        this.db = new SquirrelDB({
            filePath: env.databasePath,
            tables: [
                "guild_settings",
                "owners",
                "searchhub_credentials",
                "search_runs"
            ]
        });
    }

    async init(): Promise<void> {
        await mkdir(path.dirname(this.env.databasePath), { recursive: true });

        await this.db.initTable("guild_settings", {
            columns: [
                ["prefix", "string"],
                ["createdAt", "string"],
                ["updatedAt", "string"]
            ]
        });

        await this.db.initTable("owners", {
            columns: [
                ["addedAt", "string"],
                ["addedBy", "string"]
            ]
        });

        await this.db.initTable("searchhub_credentials", {
            columns: [
                ["selfbotToken", "string"],
                ["searchBaseUrl", "string"],
                ["updatedAt", "string"],
                ["updatedBy", "string"]
            ]
        });

        await this.db.initTable("search_runs", {
            columns: [
                ["announceChannelId", "string"],
                ["status", "string"],
                ["progress", "json"],
                ["startedBy", "string"],
                ["startedAt", "string"],
                ["updatedAt", "string"],
                ["lastError", "string"]
            ]
        });

        await this.getSearchHubCredentials();
        await this.bootstrapOwners(this.env.bootstrapOwners);
    }

    async getGuildSettings(guildId: string): Promise<GuildSettingsRecord> {
        const existing = await this.db.get<GuildSettingsRecord>("guild_settings", guildId);
        if (existing) {
            return existing;
        }

        const now = new Date().toISOString();
        return this.db.add("guild_settings", {
            id: guildId,
            prefix: this.defaultPrefix,
            createdAt: now,
            updatedAt: now
        }) as Promise<GuildSettingsRecord>;
    }

    async setGuildPrefix(guildId: string, prefix: string): Promise<GuildSettingsRecord> {
        const current = await this.getGuildSettings(guildId);
        return this.db.add("guild_settings", {
            ...current,
            id: guildId,
            prefix,
            updatedAt: new Date().toISOString()
        }) as Promise<GuildSettingsRecord>;
    }

    async listOwners(): Promise<OwnerRecord[]> {
        const owners = await this.db.all<OwnerRecord>("owners");
        return owners.sort((first, second) => first.addedAt.localeCompare(second.addedAt));
    }

    async countOwners(): Promise<number> {
        const owners = await this.listOwners();
        return owners.length;
    }

    async isOwner(userId: string): Promise<boolean> {
        return this.db.has("owners", userId);
    }

    async addOwner(userId: string, addedBy: string): Promise<{ created: boolean; owner: OwnerRecord }> {
        const existing = await this.db.get<OwnerRecord>("owners", userId);
        if (existing) {
            return { created: false, owner: existing };
        }

        const owner = await this.db.add("owners", {
            id: userId,
            addedAt: new Date().toISOString(),
            addedBy
        }) as OwnerRecord;

        return { created: true, owner };
    }

    async removeOwner(userId: string): Promise<boolean> {
        const deleted = await this.db.delete("owners", userId);
        return deleted > 0;
    }

    async bootstrapOwners(userIds: string[]): Promise<void> {
        for (const userId of userIds) {
            if (!userId) {
                continue;
            }

            await this.addOwner(userId, "bootstrap");
        }
    }

    async getSearchHubCredentials(): Promise<SearchHubCredentialsRecord> {
        const existing = await this.db.get<SearchHubCredentialsRecord>("searchhub_credentials", SEARCHHUB_RECORD_ID);
        if (existing) {
            return {
                ...existing,
                selfbotToken: existing.selfbotToken || null
            };
        }

        const now = new Date().toISOString();
        const created = await this.db.add("searchhub_credentials", {
            id: SEARCHHUB_RECORD_ID,
            selfbotToken: "",
            searchBaseUrl: "https://searchhub.vip",
            updatedAt: now,
            updatedBy: "system"
        }) as SearchHubCredentialsRecord;

        return {
            ...created,
            selfbotToken: null
        };
    }

    async updateSearchHubCredentials(
        partial: Partial<Pick<SearchHubCredentialsRecord, "selfbotToken" | "searchBaseUrl">>,
        updatedBy: string
    ): Promise<SearchHubCredentialsRecord> {
        const current = await this.getSearchHubCredentials();
        const nextSelfbotToken = Object.prototype.hasOwnProperty.call(partial, "selfbotToken")
            ? partial.selfbotToken ?? ""
            : current.selfbotToken ?? "";

        const updated = await this.db.add("searchhub_credentials", {
            ...current,
            ...partial,
            id: SEARCHHUB_RECORD_ID,
            selfbotToken: nextSelfbotToken,
            updatedAt: new Date().toISOString(),
            updatedBy
        }) as SearchHubCredentialsRecord;

        return {
            ...updated,
            selfbotToken: updated.selfbotToken || null
        };
    }

    async getSearchRun(guildId: string): Promise<SearchRunRecord | null> {
        const run = await this.db.get<SearchRunRecord>("search_runs", guildId);
        if (!run) {
            return null;
        }

        return {
            ...run,
            lastError: run.lastError || null
        };
    }

    async saveSearchRun(input: {
        guildId: string;
        announceChannelId: string;
        status: SearchRunStatus;
        progress: SearchProgress;
        startedBy: string;
        startedAt: string;
        lastError?: string | null;
    }): Promise<SearchRunRecord> {
        const run = await this.db.add("search_runs", {
            id: input.guildId,
            announceChannelId: input.announceChannelId,
            status: input.status,
            progress: input.progress,
            startedBy: input.startedBy,
            startedAt: input.startedAt,
            updatedAt: new Date().toISOString(),
            lastError: input.lastError ?? ""
        }) as SearchRunRecord;

        return {
            ...run,
            lastError: run.lastError || null
        };
    }

    async deleteSearchRun(guildId: string): Promise<void> {
        await this.db.delete("search_runs", guildId);
    }
}
