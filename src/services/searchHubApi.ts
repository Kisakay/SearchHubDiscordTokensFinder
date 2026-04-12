import type { HTTPResponse } from "puppeteer";
import puppeteer from "puppeteer";

import type { AppEnv } from "../config/env";
import type { BotDatabase } from "../database";
import type { SearchHubMessage } from "../types/database";
import { sleep } from "../utils/search";

interface SearchHubApiResponse {
    messages?: SearchHubMessage[];
}

export class SearchHubApi {
    constructor(
        private readonly db: BotDatabase,
        private readonly env: AppEnv
    ) {}

    async searchDiscordUser(userId: string): Promise<SearchHubApiResponse> {
        if (!this.env.browserProfilePath) {
            throw new Error("BROWSER_PROFILE_PATH is not configured.");
        }

        const browser = await puppeteer.launch({
            headless: false,
            browser: "chrome",
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
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, "webdriver", {
                    get: () => undefined
                });
            });

            await page.setViewport({ width: 1280, height: 900 });
            console.log("[+] Ouverture SearchHub...");
            await page.goto("https://searchhub.icu/search", { waitUntil: "load" });
            await page.waitForNavigation({ waitUntil: "load" }).catch(() => null);

            const title = await page.title();
            console.log(`[+] Titre de la page: ${title}`);

            if (title.includes("Just a moment") || title.includes("Cloudflare")) {
                console.log("[!] Cloudflare détecté. Attente manuelle...");
                console.log("[!] Résous le captcha si nécessaire.");
                await page.waitForFunction(
                    () => !document.title.includes("Just a moment") && !document.title.includes("Cloudflare"),
                    { timeout: this.env.searchHubChallengeTimeoutMs }
                );
            }

            console.log("[+] Cloudflare passé !");
            await sleep(2_000);

            console.log("[+] Clique Discord...");
            await page.waitForSelector("button:has(svg[viewBox='0 0 640 512'])");
            await page.click("button:has(svg[viewBox='0 0 640 512'])");

            console.log("[+] Attente du champ ID...");
            await page.waitForSelector("form input[type='text']");
            const input = await page.$("form input[type='text']");
            if (!input) {
                throw new Error("SearchHub search input not found.");
            }

            await input.click({ clickCount: 3 });
            await input.type(userId, { delay: 100 });

            console.log("[+] Mise en place de l'écoute réseau...");
            const apiResponse = new Promise<SearchHubApiResponse | null>((resolve) => {
                page.on("response", async (response: HTTPResponse) => {
                    const url = response.url();
                    if (!url.includes("/api/search/discord")) {
                        return;
                    }

                    try {
                        const text = await response.text();
                        if (!text) {
                            resolve(null);
                            return;
                        }

                        resolve(JSON.parse(text) as SearchHubApiResponse);
                    } catch {
                        resolve(null);
                    }
                });
            });

            console.log("[+] Envoi de la recherche...");
            await input.press("Enter");
            const json = await apiResponse;

            if (!json) {
                throw new Error("SearchHub API response was not captured from the browser session.");
            }

            return json;
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
}
