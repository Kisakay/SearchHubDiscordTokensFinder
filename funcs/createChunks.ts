import type { GuildMember } from "discord.js";

export default function createChunks(members: GuildMember[], groupSize: number): GuildMember[][] {
    const chunks: GuildMember[][] = [];
    for (let i = 0; i < members.length; i += groupSize) {
        chunks.push(members.slice(i, i + groupSize));
    }
    return chunks;
}