import { pathToFileURL } from "node:url";

import type { ChatInputCommandInteraction, RESTPostAPIApplicationCommandsJSONBody } from "discord.js";

import type {
    RuntimeContext,
    SlashCommand
} from "../types/command";
import { getFilesRecursively } from "../utils/filesystem";

export async function loadSlashCommands(directory: string): Promise<Map<string, SlashCommand>> {
    const files = await getFilesRecursively(directory);
    const slashCommandFiles = files
        .filter(file => /\.(ts|js)$/.test(file))
        .filter(file => !file.endsWith(".d.ts"))
        .sort((first, second) => first.localeCompare(second));

    const commands = new Map<string, SlashCommand>();

    for (const file of slashCommandFiles) {
        const module = await import(pathToFileURL(file).href);
        const command = module.default as SlashCommand | undefined;

        const commandName = command?.data?.name;
        if (!command || !commandName) {
            continue;
        }

        commands.set(commandName, command);
    }

    return commands;
}

export async function registerSlashCommands(runtime: RuntimeContext): Promise<void> {
    if (!runtime.client.application) {
        throw new Error("Client application is not ready.");
    }

    const payload = [...runtime.slashCommands.values()].map(command =>
        command.data.toJSON() as RESTPostAPIApplicationCommandsJSONBody
    );

    await runtime.client.application.commands.set(payload);
}

export async function handleSlashInteraction(
    runtime: RuntimeContext,
    interaction: ChatInputCommandInteraction
): Promise<void> {
    const command = runtime.slashCommands.get(interaction.commandName);
    if (!command) {
        await runtime.messenger.respondToInteraction(interaction, {
            content: "> *Commande slash inconnue.*"
        });
        return;
    }

    try {
        await command.execute({
            runtime,
            client: runtime.client,
            db: runtime.db,
            messenger: runtime.messenger,
            searchService: runtime.searchService,
            interaction
        });
    } catch (error) {
        console.error(`❌ Erreur dans la slash commande ${interaction.commandName}`, error);

        if (interaction.replied || interaction.deferred) {
            await runtime.messenger.followUpInteraction(interaction, {
                content: "> *Une erreur est survenue pendant l'exécution de la commande.*"
            }).catch(() => null);
            return;
        }

        await runtime.messenger.respondToInteraction(interaction, {
            content: "> *Une erreur est survenue pendant l'exécution de la commande.*"
        }).catch(() => null);
    }
}
