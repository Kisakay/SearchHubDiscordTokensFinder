import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// puppeteer.use(StealthPlugin());

export async function searchhubDiscordHuman(
    username: string,
    password: string,
    discordId: string
) {
    const FIREFOX_PROFILE_PATH = process.env.FIREFOX_USER_PATH!;

    console.log(process.env.PUPPETEER_EXECUTABLE_PATH)
    const browser = await puppeteer.launch({
        headless: false,
        browser: "firefox", // IMPORTANT: utiliser Firefox
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Chemin vers ton Firefox
        args: [
            `--profile=${FIREFOX_PROFILE_PATH}`, // Utilise ton profil
            // "--no-sandbox",
            // "--disable-setuid-sandbox",
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
    await page.goto("https://searchhub.vip/", { waitUntil: "load" });

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

    // === 2. Cliquer sur Login ===
    console.log("[+] Clique sur Login...");
    await page.waitForSelector("a[href='/login']", { timeout: 10000 });
    await page.click("a[href='/login']");
    await page.waitForSelector("#username", { timeout: 10000 });

    // === 3. Entrer login ===
    console.log("[+] Remplissage username...");
    await page.type("#username", username, { delay: 100 });
    console.log("[+] Remplissage password...");
    await page.type("#password", password, { delay: 100 });

    // === 4. Cliquer sur Log in → ===
    console.log("[+] clic bouton Log in →");
    await page.click("button[type='submit']");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log("[+] Connecté.");

    // === 5. Aller dans Search ===
    console.log("[+] Navigation vers /search...");
    await page.click("a[href='/search']");
    await page.waitForNavigation({ waitUntil: "networkidle2" });

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
                try {
                    const data = await res.json();
                    resolve(data);
                } catch (e) {
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
