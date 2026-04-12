export function extractUserId(input: string): string | null {
    const trimmed = input.trim();
    const mentionMatch = trimmed.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        return mentionMatch[1] ?? null;
    }

    return /^\d+$/.test(trimmed) ? trimmed : null;
}

export function maskSecret(value: string | null, visibleChars: number = 6): string {
    if (!value) {
        return "not configured";
    }

    if (value.length <= visibleChars * 2) {
        return `${"*".repeat(Math.max(0, value.length - visibleChars))}${value.slice(-visibleChars)}`;
    }

    return `${value.slice(0, visibleChars)}...${value.slice(-visibleChars)}`;
}
