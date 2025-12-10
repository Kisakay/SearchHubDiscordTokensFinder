import puppeteer from "puppeteer-extra";

export async function searchhubDiscordHuman(
    username: string,
    password: string,
    discordId: string
) {
    const BROWSER_PROFILE_PATH = process.env.BROWSER_PROFILE_PATH!;

    console.log(BROWSER_PROFILE_PATH)
    const browser = await puppeteer.launch({
        headless: false,
        browser: "chrome",
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
            `--user-data-dir=${BROWSER_PROFILE_PATH}`,
            '--profile-directory=Default',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });


    await page.setViewport({ width: 1280, height: 900 });
    console.log("[+] Ouverture SearchHub...");
    await page.goto("https://searchhub.vip/search", { waitUntil: "load" });

    await page.waitForNavigation({ waitUntil: "load" });

    // Vérifier si on est bloqué par Cloudflare
    const title = await page.title();
    console.log(`[+] Titre de la page: ${title}`);

    if (title.includes("Just a moment") || title.includes("Cloudflare")) {
        console.log("[!] Cloudflare détecté. Attente manuelle...");
        console.log("[!] Résous le captcha si nécessaire.");
        // Attendre que la page change (cloudflare passé)
        await page.waitForFunction(
            () => !document.title.includes("Just a moment") && !document.title.includes("Cloudflare"),
            { timeout: 120000 } // 2 minutes max
        );
    }

    console.log("[+] Cloudflare passé !");

    await Bun.sleep(3995);

    // === 5. Aller dans Search ===
    console.log("[+] Navigation vers /search...");

    await Bun.sleep(5000)
    // === 6. Choisir Discord ===
    console.log("[+] Clique Discord...");
    await page.waitForSelector("button:has(svg[viewBox='0 0 640 512'])");
    await page.click("button:has(svg[viewBox='0 0 640 512'])");

    // === 7. Entrer l'ID utilisateur ===
    console.log("[+] Attente du champ ID...");
    await page.waitForSelector("form input[type='text']");
    const input = await page.$("form input[type='text']");
    await input!.click({ clickCount: 3 });
    await input!.type(discordId, { delay: 100 });

    // === 8. Intercepter la requête API ===
    console.log("[+] Mise en place de l'écoute réseau...");
    const apiResponse = new Promise((resolve) => {
        page.on("response", async (res) => {
            const url = res.url();
            if (url.includes("/api/search/discord")) {
                console.log(`[+] API interceptée: ${url}`);
                console.log(`[+] Status: ${res.status()}`);

                try {
                    const text = await res.text();
                    console.log(`[+] Response text: ${text}`);

                    if (text) {
                        const data = JSON.parse(text);
                        resolve(data);
                    } else {
                        console.log("[!] Réponse vide");
                        resolve(null);
                    }
                } catch (e) {
                    console.error("[!] Erreur parsing:", e);
                    resolve(null);
                }
            }
        });
    });

    // === 9. Press Enter pour lancer la recherche ===
    console.log("[+] Envoi de la recherche...");
    await input!.press("Enter");
    console.log("[+] Attente du JSON...");
    const json = await apiResponse;
    console.log("[+] Reçu :");
    console.log(json);

    await browser.close();
    return json;
}
