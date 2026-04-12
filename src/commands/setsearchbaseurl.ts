import type { PrefixCommand } from "../types/command";
import { quote } from "../utils/ui";

const command: PrefixCommand = {
    name: "setsearchbaseurl",
    description: "Met à jour l'URL de base SearchHub.",
    usage: "setsearchbaseurl <url>",
    ownerOnly: true,
    async execute({ message, rawArgs, db, messenger }) {
        const value = rawArgs.trim();
        if (!value) {
            await messenger.reply(message, { content: quote("Usage: setsearchbaseurl <url>") });
            return;
        }

        try {
            const url = new URL(value);
            await db.updateSearchHubCredentials({ searchBaseUrl: url.origin }, message.author.id);
            await messenger.reply(message, { content: quote(`Base URL SearchHub mise à jour: ${url.origin}`) });
        } catch {
            await messenger.reply(message, { content: quote("URL invalide.") });
        }
    }
};

export default command;
