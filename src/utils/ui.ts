import { EmbedBuilder, type ColorResolvable, type User } from "discord.js";

const COLORS = {
    primary: 0x2f6fed,
    success: 0x2fbf71,
    warning: 0xf0b429,
    danger: 0xe05252,
    neutral: 0x5f6c7b
} as const;

export type BotColor = keyof typeof COLORS;

export function quote(message: string): string {
    return `> *${message}*`;
}

export function createBotEmbed(input: {
    title: string;
    description?: string;
    color?: BotColor;
    footer?: string;
    author?: User | null;
}): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(input.title)
        .setColor(COLORS[input.color ?? "primary"] as ColorResolvable)
        .setTimestamp();

    if (input.description) {
        embed.setDescription(input.description);
    }

    if (input.footer) {
        embed.setFooter({ text: input.footer });
    }

    if (input.author) {
        embed.setAuthor({
            name: input.author.username,
            iconURL: input.author.displayAvatarURL()
        });
    }

    return embed;
}
