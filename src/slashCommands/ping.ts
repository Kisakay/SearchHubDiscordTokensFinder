import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../types/command";

const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Affiche la latence du bot."),
    async execute({ interaction, client, messenger }) {
        await messenger.respondToInteraction(interaction, {
            content: `> *Pong! Latence API: ${Math.round(client.ws.ping)}ms | Slash active.*`
        });
    }
};

export default command;
