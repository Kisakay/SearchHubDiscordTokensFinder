import type { ClientEvents } from "discord.js";

import type { RuntimeContext } from "./command";

export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
    name: K;
    once?: boolean;
    execute(runtime: RuntimeContext, ...args: ClientEvents[K]): Promise<void>;
}
