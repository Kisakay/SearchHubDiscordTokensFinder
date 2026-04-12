import type { PrefixCommand } from "../types/command";
import {
    looksLikeDiscordUserToken,
    validateDiscordUserToken
} from "../services/discordUserApi";
import { quote } from "../utils/ui";

const command: PrefixCommand = {
    name: "setselfbottoken",
    description: "Définit ou supprime le token du compte utilisateur utilisé pour le test.",
    usage: "setselfbottoken <token|clear>",
    ownerOnly: true,
    async execute({ message, rawArgs, db, messenger }) {
        const value = rawArgs.trim();
        if (!value) {
            await messenger.reply(message, { content: quote("Usage: setselfbottoken <token|clear>") });
            return;
        }

        if (value.toLowerCase() === "clear") {
            await db.updateSearchHubCredentials(
                { selfbotToken: null },
                message.author.id
            );

            await messenger.reply(message, {
                content: quote("Selfbot token supprimé.")
            });
            return;
        }

        if (!looksLikeDiscordUserToken(value)) {
            await messenger.reply(message, {
                content: quote("Le token ne ressemble pas à un token utilisateur Discord valide.")
            });
            return;
        }

        const user = await validateDiscordUserToken(value);

        await db.updateSearchHubCredentials(
            { selfbotToken: value },
            message.author.id
        );

        await messenger.reply(message, {
            content: quote(
                `Selfbot token valide et mis à jour pour ${user.global_name ?? user.username} (${user.id}).`
            )
        });
    }
};

export default command;
