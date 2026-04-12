import type { GuildMember } from "discord.js";

export function createChunks<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getUserIdFromToken(token: string): string {
    const [userId] = token.split(".");
    if (!userId) {
        throw new Error("Invalid selfbot token format.");
    }

    return Buffer.from(userId, "base64").toString("utf8");
}

export function getMembersFromIds(
    memberIds: string[],
    membersById: Map<string, GuildMember>
): GuildMember[] {
    return memberIds
        .map(memberId => membersById.get(memberId) ?? null)
        .filter((member): member is GuildMember => member !== null);
}
