import type {
    Client,
    ChatInputCommandInteraction,
    Message,
    PermissionResolvable,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from "discord.js";

import type { BotDatabase } from "../database";
import type { BotMessenger } from "../services/botMessenger";
import type { SearchService } from "../services/searchService";

export interface PrefixCommand {
    name: string;
    description: string;
    usage: string;
    aliases?: string[];
    ownerOnly?: boolean;
    guildOnly?: boolean;
    userPermissions?: PermissionResolvable[];
    execute(context: CommandExecutionContext): Promise<void>;
}

export interface RuntimeContext {
    client: Client;
    db: BotDatabase;
    messenger: BotMessenger;
    searchService: SearchService;
    commands: Map<string, PrefixCommand>;
    aliases: Map<string, string>;
    slashCommands: Map<string, SlashCommand>;
    startedAt: number;
    defaultPrefix: string;
}

export interface CommandExecutionContext {
    runtime: RuntimeContext;
    client: Client;
    db: BotDatabase;
    messenger: BotMessenger;
    searchService: SearchService;
    message: Message;
    args: string[];
    rawArgs: string;
    prefix: string;
    command: PrefixCommand;
    isOwner: boolean;
}

export interface SlashCommand {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
    execute(context: SlashCommandExecutionContext): Promise<void>;
}

export interface SlashCommandExecutionContext {
    runtime: RuntimeContext;
    client: Client;
    db: BotDatabase;
    messenger: BotMessenger;
    searchService: SearchService;
    interaction: ChatInputCommandInteraction;
}
