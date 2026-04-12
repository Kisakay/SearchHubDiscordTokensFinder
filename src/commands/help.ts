import type { PrefixCommand } from "../types/command";
import { createBotEmbed } from "../utils/ui";

const command: PrefixCommand = {
    name: "help",
    description: "Affiche la liste des commandes.",
    usage: "help [commande]",
    aliases: ["commands"],
    async execute({ message, runtime, prefix, args, isOwner, messenger }) {
        const lookup = args[0]?.toLowerCase();
        const resolved = lookup
            ? (runtime.commands.get(lookup) ?? runtime.commands.get(runtime.aliases.get(lookup) ?? ""))
            : null;

        if (resolved) {
            const embed = createBotEmbed({
                title: `Help • ${resolved.name}`,
                description: resolved.description,
                color: "primary",
                footer: `Préfixe: ${prefix}`
            })
                .addFields(
                    { name: "Usage", value: `\`${prefix}${resolved.usage}\`` },
                    { name: "Accès", value: resolved.ownerOnly ? "Owner bot uniquement" : "Commande publique", inline: true },
                    {
                        name: "Aliases",
                        value: resolved.aliases?.length
                            ? resolved.aliases.map(alias => `\`${alias}\``).join(", ")
                            : "Aucun",
                        inline: true
                    }
                );

            await messenger.reply(message, { embeds: [embed] });
            return;
        }

        const commands = [...runtime.commands.values()]
            .filter(entry => isOwner || !entry.ownerOnly)
            .sort((first, second) => first.name.localeCompare(second.name));

        const embed = createBotEmbed({
            title: "Help",
            description: "Liste des commandes disponibles pour ce contexte.",
            color: "primary",
            footer: `Utilise ${prefix}help <commande> pour plus de détails`
        }).addFields({
            name: "Commandes",
            value: commands
                .map(entry => `\`${prefix}${entry.name}\`\n${entry.description}`)
                .join("\n\n")
        });

        await messenger.reply(message, { embeds: [embed] });
    }
};

export default command;
