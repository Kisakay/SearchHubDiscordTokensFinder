import { pathToFileURL } from "node:url";

import type { RuntimeContext } from "../types/command";
import type { BotEvent } from "../types/event";
import { getFilesRecursively } from "../utils/filesystem";

export async function loadEvents(eventsDirectory: string): Promise<BotEvent[]> {
    const files = await getFilesRecursively(eventsDirectory);
    const eventFiles = files
        .filter(file => /\.(ts|js)$/.test(file))
        .filter(file => !file.endsWith(".d.ts"))
        .sort((first, second) => first.localeCompare(second));

    const events: BotEvent[] = [];
    for (const file of eventFiles) {
        const module = await import(pathToFileURL(file).href);
        const event = module.default as BotEvent | undefined;

        if (event?.name) {
            events.push(event);
        }
    }

    return events;
}

export function registerEvents(runtime: RuntimeContext, events: BotEvent[]): void {
    for (const event of events) {
        if (event.once) {
            runtime.client.once(event.name, (...args) => void event.execute(runtime, ...args));
            continue;
        }

        runtime.client.on(event.name, (...args) => void event.execute(runtime, ...args));
    }
}
