import type {
    APIEmbed,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Message
} from "discord.js";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const AUTO_DELETE_DELAY_MS = 10 * 60 * 1000;

interface DiscordApiMessage {
    id: string;
    channel_id: string;
    timestamp?: string;
}

interface BotMessagePayload {
    content?: string;
    embeds?: Array<EmbedBuilder | APIEmbed>;
}

function normalizePayload(payload: BotMessagePayload): { content?: string; embeds?: APIEmbed[] } {
    return {
        content: payload.content,
        embeds: payload.embeds?.map(embed => typeof (embed as EmbedBuilder).toJSON === "function"
            ? (embed as EmbedBuilder).toJSON()
            : embed as APIEmbed)
    };
}

export class BotMessenger {
    constructor(private readonly botToken: string) {}

    async reply(message: Message, payload: BotMessagePayload): Promise<DiscordApiMessage> {
        return this.sendToChannel(message.channelId, payload, message.id);
    }

    async sendToChannel(
        channelId: string,
        payload: BotMessagePayload,
        replyToMessageId?: string
    ): Promise<DiscordApiMessage> {
        const response = await fetch(`${DISCORD_API_BASE_URL}/channels/${channelId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${this.botToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...normalizePayload(payload),
                allowed_mentions: {
                    replied_user: false
                },
                message_reference: replyToMessageId
                    ? {
                        message_id: replyToMessageId,
                        fail_if_not_exists: false
                    }
                    : undefined
            })
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Bot message send failed (${response.status}): ${body}`);
        }

        const sentMessage = await response.json() as DiscordApiMessage;
        this.scheduleChannelDeletion(sentMessage.channel_id, sentMessage.id);
        return sentMessage;
    }

    async respondToInteraction(
        interaction: ChatInputCommandInteraction,
        payload: BotMessagePayload
    ): Promise<void> {
        const response = await fetch(
            `${DISCORD_API_BASE_URL}/interactions/${interaction.id}/${interaction.token}/callback`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bot ${this.botToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    type: 4,
                    data: normalizePayload(payload)
                })
            }
        );

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Interaction response failed (${response.status}): ${body}`);
        }

        this.scheduleInteractionDeletion(interaction.applicationId, interaction.token);
    }

    async followUpInteraction(
        interaction: ChatInputCommandInteraction,
        payload: BotMessagePayload
    ): Promise<void> {
        const response = await fetch(
            `${DISCORD_API_BASE_URL}/webhooks/${interaction.applicationId}/${interaction.token}?wait=true`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bot ${this.botToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(normalizePayload(payload))
            }
        );

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Interaction follow-up failed (${response.status}): ${body}`);
        }

        const sentMessage = await response.json() as DiscordApiMessage;
        this.scheduleWebhookDeletion(interaction.applicationId, interaction.token, sentMessage.id);
    }

    private scheduleChannelDeletion(channelId: string, messageId: string): void {
        const timer = setTimeout(() => {
            void this.deleteChannelMessage(channelId, messageId);
        }, AUTO_DELETE_DELAY_MS);

        timer.unref?.();
    }

    private scheduleInteractionDeletion(applicationId: string, interactionToken: string): void {
        const timer = setTimeout(() => {
            void this.deleteInteractionResponse(applicationId, interactionToken);
        }, AUTO_DELETE_DELAY_MS);

        timer.unref?.();
    }

    private scheduleWebhookDeletion(applicationId: string, interactionToken: string, messageId: string): void {
        const timer = setTimeout(() => {
            void this.deleteWebhookMessage(applicationId, interactionToken, messageId);
        }, AUTO_DELETE_DELAY_MS);

        timer.unref?.();
    }

    private async deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
        await fetch(`${DISCORD_API_BASE_URL}/channels/${channelId}/messages/${messageId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bot ${this.botToken}`
            }
        }).catch(() => null);
    }

    private async deleteInteractionResponse(applicationId: string, interactionToken: string): Promise<void> {
        await fetch(`${DISCORD_API_BASE_URL}/webhooks/${applicationId}/${interactionToken}/messages/@original`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bot ${this.botToken}`
            }
        }).catch(() => null);
    }

    private async deleteWebhookMessage(applicationId: string, interactionToken: string, messageId: string): Promise<void> {
        await fetch(`${DISCORD_API_BASE_URL}/webhooks/${applicationId}/${interactionToken}/messages/${messageId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bot ${this.botToken}`
            }
        }).catch(() => null);
    }
}
