import type { Guild, GuildMember, TextChannel } from "discord.js";

import type { SearchProgress } from "../types/database";
import { sleep } from "../utils/search";
import { syncMembersWithGroupRole } from "./groupRoles";
import { sendSelfbotMessage } from "./sendSelfbotMessage";

function generateRandomCode(): string {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export interface DetectLoggerOptions {
    guild: Guild;
    channel: TextChannel;
    members: GuildMember[];
    groupName: string;
    progress: SearchProgress;
    selfbotToken: string;
    selfbotUserId: string;
    selfbotMember: GuildMember;
    waitAfterMessageMs: number;
    persistProgress: () => Promise<void>;
    checkMessageLogged: (selfbotUserId: string, testCode: string) => Promise<boolean>;
    depth?: number;
}

export async function detectLoggerInGroup({
    guild,
    channel,
    members,
    groupName,
    progress,
    selfbotToken,
    selfbotUserId,
    selfbotMember,
    waitAfterMessageMs,
    persistProgress,
    checkMessageLogged,
    depth = 0
}: DetectLoggerOptions): Promise<GuildMember | null> {
    const indent = "  ".repeat(depth);
    console.log(`\n${indent}[Depth ${depth}] Analyse ${groupName} - ${members.length} membre(s)`);

    if (members.length === 0) {
        console.log(`${indent}⚠️ Aucun membre à analyser`);
        return null;
    }

    if (members.length === 1) {
        console.log(`${indent}🎯 Logger identifié: ${members[0]!.user.tag} (${members[0]!.id})`);
        return members[0]!;
    }

    const { role } = await syncMembersWithGroupRole(
        guild,
        progress,
        groupName,
        members,
        depth,
        persistProgress,
        indent
    );

    await sleep(1_000);

    await channel.permissionOverwrites.edit(role, {
        ViewChannel: true,
        ReadMessageHistory: true
    });

    console.log(`${indent}✅ Permission accordée au rôle ${role.name}`);
    await sleep(1_000);

    const testCode = generateRandomCode();
    const testMessage = `Hello world for ${groupName} group ${testCode}`;
    console.log(`${indent}📤 Message test: "${testMessage}"`);

    await channel.permissionOverwrites.edit(selfbotMember, {
        SendMessages: true,
        AddReactions: true,
        ViewChannel: true,
        ReadMessageHistory: true
    });

    await sendSelfbotMessage(selfbotToken, guild.id, channel.id, testMessage);

    console.log(`${indent}⏳ Attente de ${waitAfterMessageMs}ms avant la vérification SearchHub...`);
    await sleep(waitAfterMessageMs);

    try {
        await channel.permissionOverwrites.edit(role, {
            ViewChannel: false,
            ReadMessageHistory: false
        });
        console.log(`${indent}🔒 Permission retirée`);
    } catch (error) {
        console.error(`${indent}⚠️ Impossible de retirer la permission du rôle`, error);
    }

    const messageIsLogged = await checkMessageLogged(selfbotUserId, testCode);

    if (!messageIsLogged) {
        console.log(`${indent}✅ Aucun logger dans ce groupe`);
        return null;
    }

    const midPoint = Math.ceil(members.length / 2);
    const chunkA = members.slice(0, midPoint);
    const chunkB = members.slice(midPoint);

    console.log(`${indent}📊 Subdivision: A(${chunkA.length}) | B(${chunkB.length})`);

    const loggerInA = await detectLoggerInGroup({
        guild,
        channel,
        members: chunkA,
        groupName: `${groupName}_A`,
        progress,
        selfbotToken,
        selfbotUserId,
        selfbotMember,
        waitAfterMessageMs,
        persistProgress,
        checkMessageLogged,
        depth: depth + 1
    });

    if (loggerInA) {
        return loggerInA;
    }

    return detectLoggerInGroup({
        guild,
        channel,
        members: chunkB,
        groupName: `${groupName}_B`,
        progress,
        selfbotToken,
        selfbotUserId,
        selfbotMember,
        waitAfterMessageMs,
        persistProgress,
        checkMessageLogged,
        depth: depth + 1
    });
}
