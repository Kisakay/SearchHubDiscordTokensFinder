declare namespace NodeJS {
    interface ProcessEnv {
        TOKEN?: string;
        DEFAULT_PREFIX?: string;
        DATABASE_PATH?: string;
        BOT_OWNERS?: string;
        SEARCH_GROUP_SIZE?: string;
        SEARCH_MESSAGE_WAIT_MS?: string;
        SEARCHHUB_CHALLENGE_TIMEOUT_MS?: string;
        BROWSER_PROFILE_PATH?: string;
        PUPPETEER_EXECUTABLE_PATH?: string;
    }
}
