import { Events } from "discord.js";

import { handleCommandMessage } from "../handlers/commandHandler";
import type { BotEvent } from "../types/event";

const event: BotEvent<Events.MessageCreate> = {
    name: Events.MessageCreate,
    async execute(runtime, message) {
        await handleCommandMessage(runtime, message);
    }
};

export default event;
