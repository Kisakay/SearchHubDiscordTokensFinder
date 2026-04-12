import type { PrefixCommand } from "../types/command";
import { maskSecret } from "../utils/discord";
import { createBotEmbed } from "../utils/ui";

const command: PrefixCommand = {
    name: "searchconfig",
    description: "Affiche l'état de la configuration SearchHub.",
    usage: "searchconfig",
    ownerOnly: true,
    async execute({ message, db, runtime, messenger }) {
        const credentials = await db.getSearchHubCredentials();
        const updatedBy = /^\d+$/.test(credentials.updatedBy)
            ? `<@${credentials.updatedBy}>`
            : credentials.updatedBy;
        const browserConfig = runtime.searchService.getConfigurationStatus();

        const embed = createBotEmbed({
            title: "SearchHub Config",
            description: "Etat actuel de la configuration utilisée pour la recherche.",
            color: "neutral"
        }).addFields(
            { name: "Base URL", value: `\`${credentials.searchBaseUrl}\`` },
            { name: "Selfbot token", value: `\`${maskSecret(credentials.selfbotToken)}\``, inline: true },
            { name: "Browser profile", value: browserConfig.browserProfileConfigured ? "Configuré" : "Manquant", inline: true },
            { name: "Puppeteer executable", value: browserConfig.puppeteerExecutableConfigured ? "Configuré" : "Par défaut", inline: true },
            { name: "Dernière mise à jour", value: `${updatedBy}\n${new Date(credentials.updatedAt).toLocaleString("fr-FR")}` }
        );

        await messenger.reply(message, { embeds: [embed] });
    }
};

export default command;
