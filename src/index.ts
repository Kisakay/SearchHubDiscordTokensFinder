import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    Client,
    GatewayIntentBits
} from "discord.js";

import { loadEnv } from "./config/env";
import { BotDatabase } from "./database";
import { BotMessenger } from "./services/botMessenger";
import { SearchService } from "./services/searchService";
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents, registerEvents } from "./handlers/eventHandler";
import { loadSlashCommands } from "./handlers/slashCommandHandler";
import type { RuntimeContext } from "./types/command";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

async function bootstrap(): Promise<void> {
    const env = loadEnv();
    const db = new BotDatabase(env);
    await db.init();
    const messenger = new BotMessenger(env.token);

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    const { commands, aliases } = await loadCommands(path.join(currentDirectory, "commands"));
    const slashCommands = await loadSlashCommands(path.join(currentDirectory, "slashCommands"));
    const events = await loadEvents(path.join(currentDirectory, "events"));
    const searchService = new SearchService(db, env, messenger);

    const runtime: RuntimeContext = {
        client,
        db,
        messenger,
        searchService,
        commands,
        aliases,
        slashCommands,
        startedAt: Date.now(),
        defaultPrefix: env.defaultPrefix
    };

    registerEvents(runtime, events);
    await client.login(env.token);
}

bootstrap().catch(error => {
    console.error("❌ Impossible de démarrer le bot", error);
    process.exit(1);
});
