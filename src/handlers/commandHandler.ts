import { pathToFileURL } from "node:url";

import type { Message } from "discord.js";

import type {
    CommandExecutionContext,
    PrefixCommand,
    RuntimeContext
} from "../types/command";
import { getFilesRecursively } from "../utils/filesystem";
import { quote } from "../utils/ui";

function parseArgs(rawArgs: string): string[] {
    const matches = rawArgs.match(/"([^"]*)"|'([^']*)'|(\S+)/g) ?? [];
    return matches.map(match => match.replace(/^['"]|['"]$/g, ""));
}

export async function loadCommands(commandsDirectory: string): Promise<{
    commands: Map<string, PrefixCommand>;
    aliases: Map<string, string>;
}> {
    const files = await getFilesRecursively(commandsDirectory);
    const commandFiles = files
        .filter(file => /\.(ts|js)$/.test(file))
        .filter(file => !file.endsWith(".d.ts"))
        .sort((first, second) => first.localeCompare(second));

    const commands = new Map<string, PrefixCommand>();
    const aliases = new Map<string, string>();

    for (const file of commandFiles) {
        const module = await import(pathToFileURL(file).href);
        const command = module.default as PrefixCommand | undefined;

        if (!command?.name) {
            continue;
        }

        const commandName = command.name.toLowerCase();
        commands.set(commandName, command);

        for (const alias of command.aliases ?? []) {
            aliases.set(alias.toLowerCase(), commandName);
        }
    }

    return { commands, aliases };
}

export async function handleCommandMessage(runtime: RuntimeContext, message: Message): Promise<void> {
    if (message.author.bot) {
        return;
    }

    const mentionRegex = runtime.client.user
        ? new RegExp(`^<@!?${runtime.client.user.id}>$`)
        : null;

    const prefix = message.guildId
        ? (await runtime.db.getGuildSettings(message.guildId)).prefix
        : runtime.defaultPrefix;

    if (mentionRegex?.test(message.content.trim())) {
        await runtime.messenger.reply(message, { content: quote(`Préfixe actuel: ${prefix}`) });
        return;
    }

    if (!message.content.startsWith(prefix)) {
        return;
    }

    const payload = message.content.slice(prefix.length).trim();
    if (!payload) {
        return;
    }

    const firstSpace = payload.indexOf(" ");
    const commandName = (firstSpace === -1 ? payload : payload.slice(0, firstSpace)).toLowerCase();
    const rawArgs = firstSpace === -1 ? "" : payload.slice(firstSpace + 1).trim();
    const args = parseArgs(rawArgs);
    const resolvedName = runtime.commands.has(commandName)
        ? commandName
        : runtime.aliases.get(commandName);

    if (!resolvedName) {
        return;
    }

    const command = runtime.commands.get(resolvedName);
    if (!command) {
        return;
    }

    const isOwner = await runtime.db.isOwner(message.author.id);

    if (command.guildOnly && !message.guild) {
        await runtime.messenger.reply(message, { content: quote("Cette commande doit être utilisée dans un serveur.") });
        return;
    }

    if (command.ownerOnly && !isOwner) {
        await runtime.messenger.reply(message, { content: quote("Cette commande est réservée aux owners du bot.") });
        return;
    }

    if (command.userPermissions?.length && message.guild && !isOwner) {
        const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member?.permissions.has(command.userPermissions)) {
            await runtime.messenger.reply(message, { content: quote("Tu n'as pas les permissions nécessaires pour cette commande.") });
            return;
        }
    }

    const context: CommandExecutionContext = {
        runtime,
        client: runtime.client,
        db: runtime.db,
        messenger: runtime.messenger,
        searchService: runtime.searchService,
        message,
        args,
        rawArgs,
        prefix,
        command,
        isOwner
    };

    try {

        setTimeout(() => {
            message.deletable ?? message.delete()
        }, 60_000 * 10)

        await command.execute(context);
    } catch (error) {
        console.error(`❌ Erreur dans la commande ${command.name}`, error);
        await runtime.messenger.reply(message, { content: quote("Une erreur est survenue pendant l'exécution de la commande.") });
    }
}
