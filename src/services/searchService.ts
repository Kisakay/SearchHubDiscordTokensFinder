import {
    ChannelType,
    type Guild,
    type GuildMember,
    type TextChannel
} from "discord.js";

import type { AppEnv } from "../config/env";
import type { BotDatabase } from "../database";
import type { BotMessenger } from "./botMessenger";
import type {
    SearchProgress,
    SearchRunRecord
} from "../types/database";
import { createChunks, getMembersFromIds, getUserIdFromToken, sleep } from "../utils/search";
import { createDetectionChannel } from "../search/createDetectionChannel";
import { detectLoggerInGroup } from "../search/detectLoggerInGroup";
import {
    createNewProgress,
    getActiveRoleGroups,
    getMainRoleGroups,
    getRootGroupId,
    markFoundLogger,
    markLegitUsers,
    normalizeProgress
} from "../search/progress";
import { syncMembersWithGroupRole } from "../search/groupRoles";
import { SearchHubApi } from "./searchHubApi";

export class SearchService {
    private readonly searchHubApi: SearchHubApi;
    private readonly activeGuilds = new Set<string>();

    constructor(
        private readonly db: BotDatabase,
        private readonly env: AppEnv,
        private readonly messenger: BotMessenger
    ) {
        this.searchHubApi = new SearchHubApi(db, env);
    }

    getConfigurationStatus(): {
        browserProfileConfigured: boolean;
        puppeteerExecutableConfigured: boolean;
    } {
        return {
            browserProfileConfigured: Boolean(this.env.browserProfilePath),
            puppeteerExecutableConfigured: Boolean(this.env.puppeteerExecutablePath)
        };
    }

    async queueSearch(guild: Guild, announceChannel: TextChannel, requestedBy: string): Promise<"started" | "resumed"> {
        if (this.activeGuilds.has(guild.id)) {
            throw new Error("A search is already running for this guild.");
        }

        const existingRun = await this.db.getSearchRun(guild.id);
        const mode = existingRun ? "resumed" : "started";

        this.activeGuilds.add(guild.id);

        void this.executeSearch(guild, announceChannel.id, requestedBy, existingRun)
            .finally(() => {
                this.activeGuilds.delete(guild.id);
            });

        return mode;
    }

    private async executeSearch(
        guild: Guild,
        announceChannelId: string,
        requestedBy: string,
        existingRun: SearchRunRecord | null
    ): Promise<void> {
        const startedAt = existingRun?.startedAt ?? new Date().toISOString();
        let progress = normalizeProgress(existingRun?.progress ?? createNewProgress(null));

        const persistProgress = async (status: "running" | "paused", lastError?: string | null): Promise<void> => {
            progress = normalizeProgress(progress);
            await this.db.saveSearchRun({
                guildId: guild.id,
                announceChannelId,
                status,
                progress,
                startedBy: existingRun?.startedBy ?? requestedBy,
                startedAt,
                lastError
            });
        };

        try {
            const announceChannel = await this.resolveTextChannel(guild, announceChannelId);
            const credentials = await this.db.getSearchHubCredentials();

            if (!this.env.browserProfilePath) {
                throw new Error("BROWSER_PROFILE_PATH is not configured.");
            }

            if (!credentials.selfbotToken) {
                throw new Error("Selfbot token not configured. Use the prefix command to set it first.");
            }

            const selfbotUserId = getUserIdFromToken(credentials.selfbotToken);
            let trapChannel = await this.getOrCreateTrapChannel(guild, progress, selfbotUserId);

            progress.channelId = trapChannel.id;
            await persistProgress("running");

            await this.sendAnnouncement(
                announceChannel?.id ?? null,
                existingRun
                    ? `Reprise de la recherche SearchHub sur **${guild.name}**.`
                    : `Recherche SearchHub lancée sur **${guild.name}**.`
            );

            console.log(`🔗 Connecté au serveur ${guild.name}`);
            console.log(`👤 Selfbot ID: ${selfbotUserId}`);

            await guild.members.fetch();
            const members = Array.from(guild.members.cache.values())
                .filter(member => !member.user.bot && member.id !== selfbotUserId);

            console.log(`👥 ${members.length} membre(s) à analyser`);

            if (members.length === 0) {
                await this.sendAnnouncement(announceChannel?.id ?? null, "Aucun membre humain à analyser.");
                await this.cleanupResources(guild, progress);
                await this.db.deleteSearchRun(guild.id);
                return;
            }

            const mainChunks = progress.roleGroups.length > 0
                ? await this.restoreMainChunksFromProgress(guild, progress, members, () => persistProgress("running"))
                : await this.initializeMainGroups(guild, progress, members, () => persistProgress("running"));

            console.log(`📦 ${mainChunks.length} groupe(s) principal(aux) prêt(s)`);

            const foundLoggers: GuildMember[] = [];
            for (let index = progress.currentMainGroup; index < mainChunks.length; index++) {
                progress.currentMainGroup = index;
                progress.lastUpdate = new Date().toISOString();
                await persistProgress("running");

                const logger = await detectLoggerInGroup({
                    guild,
                    channel: trapChannel,
                    members: mainChunks[index]!,
                    groupName: `${index + 1}`,
                    progress,
                    selfbotToken: credentials.selfbotToken,
                    selfbotUserId,
                    waitAfterMessageMs: this.env.searchMessageWaitMs,
                    persistProgress: async () => persistProgress("running"),
                    checkMessageLogged: (targetUserId, marker) => this.searchHubApi.checkMessageLogged(targetUserId, marker)
                });

                if (logger) {
                    foundLoggers.push(logger);
                    markFoundLogger(progress, logger.id);
                    await persistProgress("running");

                    let banStatus = "ban non exécuté";
                    try {
                        await logger.ban({ reason: "Detected via SearchHub logger search" });
                        banStatus = "banni";
                    } catch (error) {
                        console.error(`❌ Erreur de bannissement pour ${logger.user.tag}`, error);
                        banStatus = "détecté mais bannissement échoué";
                    }

                    await this.sendAnnouncement(
                        announceChannel?.id ?? null,
                        `Logger détecté: **${logger.user.tag}** (\`${logger.id}\`) - ${banStatus}.`
                    );
                } else {
                    markLegitUsers(progress, mainChunks[index]!.map(member => member.id));
                    await persistProgress("running");
                }

                await sleep(2_000);
                trapChannel = await this.getOrCreateTrapChannel(guild, progress, selfbotUserId);
            }

            await this.cleanupResources(guild, progress);
            await this.db.deleteSearchRun(guild.id);

            const loggerSummary = foundLoggers.length > 0
                ? foundLoggers.map(member => `- ${member.user.tag} (\`${member.id}\`)`).join("\n")
                : "Aucun logger détecté.";

            await this.sendAnnouncement(
                announceChannel?.id ?? null,
                `Recherche terminée.\n${loggerSummary}`
            );
        } catch (error) {
            const announceChannel = await this.resolveTextChannel(guild, announceChannelId);
            const message = error instanceof Error ? error.message : String(error);

            console.error("❌ Erreur fatale pendant la recherche", error);
            await persistProgress("paused", message);
            await this.sendAnnouncement(
                announceChannel?.id ?? null,
                `La recherche a été mise en pause après une erreur: \`${message}\`\nRelance la commande de recherche pour reprendre.`
            );
        }
    }

    private async resolveTextChannel(guild: Guild, channelId: string): Promise<TextChannel | null> {
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        return channel?.isTextBased() && channel.type === ChannelType.GuildText ? channel as TextChannel : null;
    }

    private async sendAnnouncement(channelId: string | null, content: string): Promise<void> {
        if (!channelId) {
            return;
        }

        await this.messenger.sendToChannel(channelId, { content }).catch(error => {
            console.error("❌ Impossible d'envoyer l'annonce", error);
        });
    }

    private async getOrCreateTrapChannel(
        guild: Guild,
        progress: SearchProgress,
        selfbotUserId: string
    ): Promise<TextChannel> {
        if (progress.channelId) {
            const existing = await guild.channels.fetch(progress.channelId).catch(() => null);
            if (existing?.isTextBased() && existing.type === ChannelType.GuildText) {
                return existing as TextChannel;
            }
        }

        if (!guild.client.user) {
            throw new Error("Bot user is not ready.");
        }

        const channel = await createDetectionChannel(guild, guild.client.user.id, selfbotUserId);
        progress.channelId = channel.id;
        progress.lastUpdate = new Date().toISOString();
        return channel;
    }

    private async initializeMainGroups(
        guild: Guild,
        progress: SearchProgress,
        members: GuildMember[],
        persistProgress: () => Promise<void>
    ): Promise<GuildMember[][]> {
        const mainChunks = createChunks(members, this.env.searchGroupSize);
        console.log(`📦 ${mainChunks.length} groupe(s) de ~${this.env.searchGroupSize} membres créé(s)`);

        for (let index = 0; index < mainChunks.length; index++) {
            await syncMembersWithGroupRole(
                guild,
                progress,
                `${index + 1}`,
                mainChunks[index]!,
                0,
                persistProgress
            );
        }

        return mainChunks;
    }

    private async restoreMainChunksFromProgress(
        guild: Guild,
        progress: SearchProgress,
        members: GuildMember[],
        persistProgress: () => Promise<void>
    ): Promise<GuildMember[][]> {
        const membersById = new Map(members.map(member => [member.id, member]));
        const mainGroups = getMainRoleGroups(progress);
        if (mainGroups.length === 0) {
            progress.roleGroups = [];
            await persistProgress();
            return this.initializeMainGroups(guild, progress, members, persistProgress);
        }

        const activeGroups = getActiveRoleGroups(progress);
        console.log(`♻️ Reprise rapide de ${activeGroups.length} groupe(s) actif(s)...`);

        const distributedGroups = mainGroups.map(group => ({
            id: group.id,
            directMemberIds: [...group.memberIds],
            aggregateMemberIds: [...group.memberIds]
        }));

        for (const activeGroup of activeGroups) {
            const rootGroupId = getRootGroupId(activeGroup.id);
            const distributedGroup = distributedGroups.find(group => group.id === rootGroupId);
            if (!distributedGroup || activeGroup.id === rootGroupId) {
                continue;
            }

            for (const memberId of activeGroup.memberIds) {
                if (!distributedGroup.aggregateMemberIds.includes(memberId)) {
                    distributedGroup.aggregateMemberIds.push(memberId);
                }
            }
        }

        const assignedMembers = new Set(distributedGroups.flatMap(group => group.aggregateMemberIds));
        const unassignedMembers = members.filter(member => !assignedMembers.has(member.id));

        if (unassignedMembers.length > 0) {
            console.log(`➕ ${unassignedMembers.length} membre(s) sans groupe trouvé(s), redistribution...`);

            for (const member of unassignedMembers) {
                distributedGroups.sort((first, second) => first.aggregateMemberIds.length - second.aggregateMemberIds.length);
                distributedGroups[0]!.directMemberIds.push(member.id);
                distributedGroups[0]!.aggregateMemberIds.push(member.id);
            }
        }

        const mainChunks: GuildMember[][] = [];
        for (const group of distributedGroups) {
            const existingMainGroup = progress.roleGroups.find(existingGroup => existingGroup.id === group.id);
            if (existingMainGroup) {
                existingMainGroup.memberIds = [...group.aggregateMemberIds];
                existingMainGroup.lastSyncedAt = new Date().toISOString();
            }

            mainChunks.push(getMembersFromIds(group.aggregateMemberIds, membersById));
        }

        progress.lastUpdate = new Date().toISOString();
        await persistProgress();
        return mainChunks;
    }

    private async cleanupResources(guild: Guild, progress: SearchProgress): Promise<void> {
        for (const group of progress.roleGroups) {
            if (!group.roleId) {
                continue;
            }

            const role = await guild.roles.fetch(group.roleId).catch(() => null);
            await role?.delete("Search cleanup").catch(() => null);
        }

        if (progress.channelId) {
            const channel = await guild.channels.fetch(progress.channelId).catch(() => null);
            await channel?.delete().catch(() => null);
        }

        progress.roleGroups = [];
        progress.channelId = null;
    }
}
