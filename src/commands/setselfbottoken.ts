import type { PrefixCommand } from "../types/command";
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

        await db.updateSearchHubCredentials(
            { selfbotToken: value.toLowerCase() === "clear" ? null : value },
            message.author.id
        );

        await messenger.reply(message, {
            content: quote(
                value.toLowerCase() === "clear"
                    ? "Selfbot token supprimé."
                    : "Selfbot token mis à jour."
            )
        });
    }
};

export default command;
