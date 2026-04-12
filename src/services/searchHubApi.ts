import type { HTTPResponse, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import type { AppEnv } from "../config/env";
import type { BotDatabase } from "../database";
import type { SearchHubMessage } from "../types/database";
import { sleep } from "../utils/search";

interface SearchHubApiResponse {
    messages?: SearchHubMessage[];
}

let stealthInitialized = false;

function ensureStealthPlugin(): void {
    if (stealthInitialized) {
        return;
    }

    puppeteer.use(StealthPlugin());
    stealthInitialized = true;
}

export class SearchHubApi {
    constructor(
        private readonly db: BotDatabase,
        private readonly env: AppEnv
    ) {}

    async searchDiscordUser(userId: string): Promise<SearchHubApiResponse> {
        const credentials = await this.db.getSearchHubCredentials();
        if (!this.env.browserProfilePath) {
            throw new Error("BROWSER_PROFILE_PATH is not configured.");
        }

        ensureStealthPlugin();

        const browser = await puppeteer.launch({
            headless: false,
            executablePath: this.env.puppeteerExecutablePath ?? undefined,
            args: [
                `--user-data-dir=${this.env.browserProfilePath}`,
                "--profile-directory=Default",
                "--ozone-platform=x11"
            ],
            ignoreDefaultArgs: ["--enable-automation"]
        });

        try {
            const page = await browser.newPage();
            await this.preparePage(page);
            return await this.searchDiscordUserWithPage(page, credentials.searchBaseUrl, userId);
        } finally {
            await browser.close().catch(() => null);
        }
    }

    async checkMessageLogged(selfbotUserId: string, marker: string): Promise<boolean> {
        console.log(`    🔍 Vérification SearchHub pour ${selfbotUserId}...`);
        const data = await this.searchDiscordUser(selfbotUserId);
        const messages = Array.isArray(data.messages) ? data.messages : [];
        const found = messages.some(message => message.content?.includes(marker));

        console.log(`    ${found ? "✅" : "❌"} Message ${found ? "trouvé" : "non trouvé"} dans SearchHub`);
        return found;
    }

    private async preparePage(page: Page): Promise<void> {
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "webdriver", {
                get: () => undefined
            });
        });

        await page.setViewport({ width: 1280, height: 900 });
    }

    private async searchDiscordUserWithPage(
        page: Page,
        searchBaseUrl: string,
        userId: string
    ): Promise<SearchHubApiResponse> {
        const searchPageUrl = new URL("/search", searchBaseUrl).toString();
        console.log(`[+] Ouverture SearchHub: ${searchPageUrl}`);
        await page.goto(searchPageUrl, { waitUntil: "load" });

        await this.waitForChallengeResolution(page);
        await sleep(2_000);

        console.log("[+] Sélection Discord...");
        await page.waitForSelector("button:has(svg[viewBox='0 0 640 512'])", { timeout: 60_000 });
        await page.click("button:has(svg[viewBox='0 0 640 512'])");

        console.log("[+] Attente du champ de recherche...");
        await page.waitForSelector("form input[type='text']", { timeout: 60_000 });
        const input = await page.$("form input[type='text']");
        if (!input) {
            throw new Error("SearchHub search input not found.");
        }

        await input.click({ clickCount: 3 });
        await input.type(userId, { delay: 100 });

        console.log("[+] Envoi de la recherche...");
        const response = await this.waitForSearchResponse(page, searchBaseUrl, async () => {
            await input.press("Enter");
        });

        if (!response) {
            throw new Error("SearchHub API response was not captured from the browser session.");
        }

        return response;
    }

    private async waitForChallengeResolution(page: Page): Promise<void> {
        const title = await page.title();
        console.log(`[+] Titre de la page: ${title}`);

        if (!title.includes("Just a moment") && !title.includes("Cloudflare")) {
            return;
        }

        console.log("[!] Challenge Cloudflare détecté. Attente de résolution...");
        await page.waitForFunction(
            () => !document.title.includes("Just a moment") && !document.title.includes("Cloudflare"),
            { timeout: this.env.searchHubChallengeTimeoutMs }
        );
        console.log("[+] Challenge Cloudflare passé.");
    }

    private async waitForSearchResponse(
        page: Page,
        searchBaseUrl: string,
        trigger: () => Promise<void>
    ): Promise<SearchHubApiResponse | null> {
        const expectedHostname = new URL(searchBaseUrl).hostname;

        const responsePromise = page.waitForResponse((response: HTTPResponse) => {
            const url = new URL(response.url());
            return url.hostname === expectedHostname && url.pathname.includes("/api/search/discord");
        }, { timeout: 60_000 });

        await trigger();
        const response = await responsePromise.catch(() => null);
        if (!response) {
            return null;
        }

        const body = await response.text();
        if (!body) {
            return null;
        }

        try {
            return JSON.parse(body) as SearchHubApiResponse;
        } catch {
            return null;
        }
    }
}
