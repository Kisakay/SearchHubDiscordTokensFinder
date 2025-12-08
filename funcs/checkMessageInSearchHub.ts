import { searchDiscord } from "./searchdiscord";
import type { SearchHubMessage } from "../types/SearchHubMessage";

export default async function checkMessageInSearchHub(selfbotUserId: string, testCode: string): Promise<boolean> {
    try {
        console.log(`    🔍 Vérification SearchHub pour le selfbot...`);
        const data = await searchDiscord(selfbotUserId);

        if (Array.isArray(data)) {
            const found = data.some((msg: SearchHubMessage) =>
                msg.content && msg.content.includes(testCode)
            );
            console.log(`    ${found ? '✅' : '❌'} Message ${found ? 'trouvé' : 'non trouvé'} dans SearchHub`);
            return found;
        }
        console.log(`    ❌ Réponse SearchHub invalide`);
        return false;
    } catch (error) {
        console.error(`    ❌ Erreur SearchHub:`, error);
        return false;
    }
}