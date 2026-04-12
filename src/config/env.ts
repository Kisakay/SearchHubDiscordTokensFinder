export interface AppEnv {
    token: string;
    defaultPrefix: string;
    databasePath: string;
    bootstrapOwners: string[];
    searchGroupSize: number;
    searchMessageWaitMs: number;
    browserProfilePath: string | null;
    puppeteerExecutablePath: string | null;
    searchHubChallengeTimeoutMs: number;
}

type EnvName =
    | "TOKEN"
    | "DEFAULT_PREFIX"
    | "DATABASE_PATH"
    | "BOT_OWNERS"
    | "SEARCH_GROUP_SIZE"
    | "SEARCH_MESSAGE_WAIT_MS"
    | "SEARCHHUB_CHALLENGE_TIMEOUT_MS"
    | "BROWSER_PROFILE_PATH"
    | "PUPPETEER_EXECUTABLE_PATH";

function getRequiredEnv(name: EnvName): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

function getNumberEnv(name: EnvName, fallback: number): number {
    const rawValue = process.env[name]?.trim();
    if (!rawValue) {
        return fallback;
    }

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getOptionalEnv(name: EnvName): string | null {
    const value = process.env[name]?.trim();
    return value ? value : null;
}

export function loadEnv(): AppEnv {
    const bootstrapOwners = process.env.BOT_OWNERS
        ?.split(",")
        .map(ownerId => ownerId.trim())
        .filter(Boolean) ?? [];

    return {
        token: getRequiredEnv("TOKEN"),
        defaultPrefix: getOptionalEnv("DEFAULT_PREFIX") || "!",
        databasePath: getOptionalEnv("DATABASE_PATH") || "./data/bot.sqlite",
        bootstrapOwners,
        searchGroupSize: getNumberEnv("SEARCH_GROUP_SIZE", 200),
        searchMessageWaitMs: getNumberEnv("SEARCH_MESSAGE_WAIT_MS", 10_000),
        browserProfilePath: getOptionalEnv("BROWSER_PROFILE_PATH"),
        puppeteerExecutablePath: getOptionalEnv("PUPPETEER_EXECUTABLE_PATH"),
        searchHubChallengeTimeoutMs: getNumberEnv("SEARCHHUB_CHALLENGE_TIMEOUT_MS", 120_000)
    };
}
