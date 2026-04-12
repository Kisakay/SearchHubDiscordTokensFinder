import type { PrefixCommand } from "../types/command";
import { extractUserId } from "../utils/discord";
import { quote } from "../utils/ui";

const command: PrefixCommand = {
    name: "addowner",
    description: "Ajoute un owner au bot.",
    usage: "addowner <@user|id>",
    ownerOnly: true,
    async execute({ message, args, db, messenger }) {
        const target = extractUserId(args[0] ?? "");
        if (!target) {
            await messenger.reply(message, { content: quote("Usage: addowner <@user|id>") });
            return;
        }

        const result = await db.addOwner(target, message.author.id);
        await messenger.reply(message, {
            content: quote(
                result.created
                    ? `Owner ajouté: <@${target}>`
                    : `<@${target}> est déjà owner.`
            )
        });
    }
};

export default command;
