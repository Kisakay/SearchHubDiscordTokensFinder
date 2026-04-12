import { createBotEmbed } from "../utils/ui";
import type { PrefixCommand } from "../types/command";
import { formatDuration } from "../utils/time";

const command: PrefixCommand = {
    name: "botinfo",
    description: "Affiche les informations du bot.",
    usage: "botinfo",
    aliases: ["info"],
    async execute({ message, runtime, db, prefix, messenger }) {
        const owners = await db.countOwners();
        const guildCount = runtime.client.guilds.cache.size;
        const uptime = formatDuration(Date.now() - runtime.startedAt);

        const embed = createBotEmbed({
            title: "Bot Info",
            description: "Vue d'ensemble rapide du bot et de son état actuel.",
            color: "primary",
            footer: `Préfixe actuel: ${prefix}`
        })
            .addFields(
                { name: "Identité", value: `**${runtime.client.user?.tag ?? "unknown"}**`, inline: true },
                { name: "Serveurs", value: `\`${guildCount}\``, inline: true },
                { name: "Owners", value: `\`${owners}\``, inline: true },
                { name: "Uptime", value: `\`${uptime}\``, inline: true }
            );

        await messenger.reply(message, { embeds: [embed] });
    }
};

export default command;
