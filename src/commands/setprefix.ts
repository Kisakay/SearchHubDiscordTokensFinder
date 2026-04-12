import { PermissionFlagsBits } from "discord.js";

import type { PrefixCommand } from "../types/command";
import { quote } from "../utils/ui";

const command: PrefixCommand = {
    name: "setprefix",
    description: "Change le préfixe du bot sur ce serveur.",
    usage: "setprefix <nouveau_prefixe>",
    guildOnly: true,
    userPermissions: [PermissionFlagsBits.ManageGuild],
    async execute({ message, args, db, messenger }) {
        const nextPrefix = args[0]?.trim();

        if (!nextPrefix) {
            await messenger.reply(message, { content: quote("Usage: setprefix <nouveau_prefixe>") });
            return;
        }

        if (nextPrefix.length > 5) {
            await messenger.reply(message, { content: quote("Le préfixe doit faire 5 caractères maximum.") });
            return;
        }

        const settings = await db.setGuildPrefix(message.guildId!, nextPrefix);
        await messenger.reply(message, { content: quote(`Préfixe mis à jour: ${settings.prefix}`) });
    }
};

export default command;
