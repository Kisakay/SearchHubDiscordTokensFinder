import {
    ChannelType,
    PermissionFlagsBits,
    type Guild,
    type TextChannel
} from "discord.js";

export async function createDetectionChannel(
    guild: Guild,
    botUserId: string,
    selfbotUserId: string
): Promise<TextChannel> {
    return guild.channels.create({
        name: `searchhub-trap-${Date.now().toString(36)}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: botUserId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ManageRoles
                ]
            },
            {
                id: selfbotUserId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            }
        ]
    }) as Promise<TextChannel>;
}
