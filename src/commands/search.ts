import { ChannelType } from "discord.js";

import type { PrefixCommand } from "../types/command";
import { createBotEmbed, quote } from "../utils/ui";

const command: PrefixCommand = {
    name: "search",
    description: "Lance ou reprend une recherche SearchHub sur le serveur courant.",
    usage: "search",
    ownerOnly: true,
    guildOnly: true,
    async execute({ message, searchService, messenger }) {
        if (!message.channel.isTextBased() || message.channel.type !== ChannelType.GuildText) {
            await messenger.reply(message, { content: quote("Cette commande doit être utilisée dans un salon textuel classique.") });
            return;
        }

        const mode = await searchService.queueSearch(
            message.guild!,
            message.channel,
            message.author.id
        );

        const embed = createBotEmbed({
            title: mode === "started" ? "Recherche Lancée" : "Recherche Reprise",
            description: mode === "started"
                ? "La détection SearchHub vient d'être démarrée pour ce serveur."
                : "Une détection déjà en cours a été reprise pour ce serveur.",
            color: "warning",
            author: message.author
        }).addFields(
            { name: "Salon de suivi", value: `${message.channel}`, inline: true },
            { name: "Statut", value: mode === "started" ? "En démarrage" : "En reprise", inline: true }
        );

        await messenger.reply(message, { embeds: [embed] });
    }
};

export default command;
