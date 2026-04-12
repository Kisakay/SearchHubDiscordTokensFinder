import type { PrefixCommand } from "../types/command";
import { createBotEmbed } from "../utils/ui";

const command: PrefixCommand = {
    name: "ownerlist",
    description: "Affiche la liste des owners du bot.",
    usage: "ownerlist",
    ownerOnly: true,
    async execute({ message, db, messenger }) {
        const owners = await db.listOwners();
        const embed = createBotEmbed({
            title: "Owner List",
            description: owners.length === 0
                ? "Aucun owner configuré."
                : `${owners.length} owner(s) actuellement enregistré(s).`,
            color: "warning"
        }).addFields({
            name: "Owners",
            value: owners.length === 0
                ? "Aucun"
                : owners
                    .map(owner => `• <@${owner.id}> \`${owner.id}\`\nAjouté le ${new Date(owner.addedAt).toLocaleString("fr-FR")}`)
                    .join("\n\n")
        });

        await messenger.reply(message, { embeds: [embed] });
    }
};

export default command;
