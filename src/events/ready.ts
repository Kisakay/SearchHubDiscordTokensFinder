import { ActivityType, Events } from "discord.js";

import { registerSlashCommands } from "../handlers/slashCommandHandler";
import type { BotEvent } from "../types/event";

const event: BotEvent<Events.ClientReady> = {
    name: Events.ClientReady,
    once: true,
    async execute(runtime, client) {
        await registerSlashCommands(runtime);

        console.log("=".repeat(70));
        console.log(`🤖 Bot connecté: ${client.user.tag}`);
        console.log(`📚 ${runtime.commands.size} commande(s) chargée(s)`);
        console.log(`⚡ ${runtime.slashCommands.size} slash commande(s) chargée(s)`);
        console.log("=".repeat(70));

        client.user.setActivity({
            name: "discord.gg/ihorizon",
            state: "made by Kisakay",
            type: ActivityType.Streaming,
            url: "https://twitch.tv/discord"
        })
    }
};

export default event;
