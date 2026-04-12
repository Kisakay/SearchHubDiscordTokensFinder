export interface DiscordCurrentUser {
    id: string;
    username: string;
    discriminator?: string;
    global_name?: string | null;
    bot?: boolean;
}

export function looksLikeDiscordUserToken(token: string): boolean {
    const trimmed = token.trim();
    if (!trimmed || /\s/.test(trimmed)) {
        return false;
    }

    const segments = trimmed.split(".");
    if (segments.length !== 3) {
        return false;
    }

    const [first, second, third] = segments;
    if (!first || !second || !third) {
        return false;
    }

    const segmentPattern = /^[A-Za-z0-9_-]+$/;
    if (!segmentPattern.test(first) || !segmentPattern.test(second) || !segmentPattern.test(third)) {
        return false;
    }

    if (first.length < 16 || first.length > 40) {
        return false;
    }

    if (second.length < 4 || second.length > 10) {
        return false;
    }

    if (third.length < 20 || third.length > 120) {
        return false;
    }

    return true;
}

export async function validateDiscordUserToken(token: string): Promise<DiscordCurrentUser> {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
        method: "GET",
        headers: {
            "Authorization": token,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
        }
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Discord user token validation failed (${response.status}): ${body}`);
    }

    const user = await response.json() as DiscordCurrentUser;
    if (!user.id || !user.username) {
        throw new Error("Discord user token validation returned an invalid user payload.");
    }

    if (user.bot) {
        throw new Error("The provided token belongs to a bot account, not a user account.");
    }

    return user;
}
