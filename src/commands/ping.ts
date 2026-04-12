import type { PrefixCommand } from "../types/command";
import { quote } from "../utils/ui";

const command: PrefixCommand = {
    name: "ping",
    description: "Affiche la latence du bot.",
    usage: "ping",
    async execute({ message, client, messenger }) {
        await messenger.reply(message, {
            content: quote(
                `Pong! Latence API: ${Math.round(client.ws.ping)}ms | Traitement: ${Date.now() - message.createdTimestamp}ms`
            )
        });
    }
};

export default command;
