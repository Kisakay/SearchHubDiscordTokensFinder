import { Events } from "discord.js";

import { handleSlashInteraction } from "../handlers/slashCommandHandler";
import type { BotEvent } from "../types/event";

const event: BotEvent<Events.InteractionCreate> = {
    name: Events.InteractionCreate,
    async execute(runtime, interaction) {
        if (!interaction.isChatInputCommand()) {
            return;
        }

        await handleSlashInteraction(runtime, interaction);
    }
};

export default event;
