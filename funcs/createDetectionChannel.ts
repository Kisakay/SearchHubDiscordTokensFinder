import { PermissionFlagsBits, type Guild, type TextChannel } from "discord.js";
import { client } from "..";

export default async function createDetectionChannel(guild: Guild): Promise<TextChannel> {
    return await guild.channels.create({
        name: 'chat-general',
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: client.user!.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ManageRoles
                ]
            }
        ]
    }) as TextChannel;
}