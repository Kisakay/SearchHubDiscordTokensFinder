import type { PrefixCommand } from "../types/command";
import { extractUserId } from "../utils/discord";
import { quote } from "../utils/ui";

const command: PrefixCommand = {
    name: "removeowner",
    description: "Retire un owner du bot.",
    usage: "removeowner <@user|id>",
    ownerOnly: true,
    async execute({ message, args, db, messenger }) {
        const target = extractUserId(args[0] ?? "");
        if (!target) {
            await messenger.reply(message, { content: quote("Usage: removeowner <@user|id>") });
            return;
        }

        const ownerCount = await db.countOwners();
        if (ownerCount <= 1) {
            await messenger.reply(message, { content: quote("Impossible de retirer le dernier owner du bot.") });
            return;
        }

        const removed = await db.removeOwner(target);
        await messenger.reply(message, {
            content: quote(removed ? `Owner retiré: <@${target}>` : "Cet utilisateur n'est pas owner.")
        });
    }
};

export default command;
