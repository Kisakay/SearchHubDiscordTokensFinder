import { searchhubDiscordHuman } from "./searchDiscordHuman";
import type { SearchHubMessage } from "../types/SearchHubMessage";

export default async function checkMessageInSearchHub(selfbotUserId: string, testCode: string): Promise<boolean> {
    try {
        console.log(`    🔍 Vérification SearchHub pour le selfbot...`);
        const data = await searchhubDiscordHuman(selfbotUserId);

        let file = Bun.file('result-batch');
        let content: string = '';

        if (await file.exists()) {
            content += await file.text()
        };

        content += `

==================
BATCH OPERATION - ${testCode} ${new Date()}
==================

`;
        content += JSON.stringify(data);

        if (Array.isArray(data?.messages)) {
            Bun.write("result-batch", content);

            const found = data.messages.some((msg: SearchHubMessage) =>
                msg.content && msg.content.includes(testCode)
            );
            console.log(`    ${found ? '✅' : '❌'} Message ${found ? 'trouvé' : 'non trouvé'} dans SearchHub`);
            return found;
        }
        console.log(`    ❌ Réponse SearchHub invalide`);

        Bun.write("result-batch", content)
        return false;
    } catch (error) {
        console.error(`    ❌ Erreur SearchHub:`, error);
        return false;
    }
}