import type { Guild, GuildMember, Role, TextChannel } from "discord.js";

import checkMessageInSearchHub from "./checkMessageInSearchHub";
import generateRandomCode from "./generateRandomCode";
import sleep from "./sleep";
import { sendSelfbotMessage } from "./sendSelfbotMessage";
import { SELFBOT_TOKEN } from "..";
import { pushGroup } from "./progress";
import { RoleManager } from "./roleManager";

export default async function detectLoggerInGroup(
    guild: Guild,
    channel: TextChannel,
    members: GuildMember[],
    groupName: string,
    selfbotUserId: string,
    roleManager: RoleManager,
    depth: number = 0
): Promise<GuildMember | null> {
    const indent = '  '.repeat(depth);
    console.log(`\n${indent}[Depth ${depth}] 🔍 Analyse ${groupName} - ${members.length} membre(s)`);

    // Cas de base: 0 membre
    if (members.length === 0) {
        console.log(`${indent}⚠️  Aucun membre à analyser`);
        return null;
    }

    // Cas de base: 1 membre trouvé = c'est le logger !
    if (members.length === 1) {
        console.log(`${indent}🎯 LOGGER IDENTIFIÉ: ${members[0]!.user.tag} (${members[0]!.id})`);
        return members[0]!;
    }

    pushGroup(members.map(x => x.id))

    // Obtenir un rôle réutilisable du pool
    const role = await roleManager.getAvailableRole();
    if (!role) {
        console.error(`${indent}❌ Aucun rôle disponible dans le pool`);
        return null;
    }
    console.log(`${indent}📝 Rôle réutilisé: ${role.name}`);

    // Retirer le rôle de tous les membres qui l'ont actuellement (nettoyage)
    try {
        const membersWithRole = (await guild.members.fetch())
            .filter(m => m.roles.cache.has(role.id));
        
        if (membersWithRole.size > 0) {
            console.log(`${indent}🧹 Nettoyage: retrait du rôle de ${membersWithRole.size} membre(s)...`);
            for (const member of membersWithRole.values()) {
                try {
                    await member.roles.remove(role);
                } catch (error) {
                    // Ignorer les erreurs silencieusement
                }
            }
            await sleep(500);
        }
    } catch (error) {
        console.error(`${indent}⚠️  Erreur lors du nettoyage du rôle:`, error);
    }

    // Assigner le rôle à tous les membres du groupe
    console.log(`${indent}👥 Attribution du rôle aux ${members.length} membre(s)...`);
    for (const member of members) {
        try {
            await member.roles.add(role);
        } catch (error) {
            console.error(`${indent}⚠️  Erreur ajout rôle à ${member.user.tag}`);
        }
    }

    await sleep(1000);

    // Donner la permission de voir le canal
    try {
        await channel.permissionOverwrites.edit(role, {
            ViewChannel: true,
            ReadMessageHistory: true
        });
        console.log(`${indent}✅ Permission accordée au rôle`);
    } catch (error) {
        console.error(`${indent}❌ Erreur permission:`, error);
        // Retirer le rôle des membres avant de le libérer
        for (const member of members) {
            try {
                await member.roles.remove(role);
            } catch {
                // Ignorer les erreurs
            }
        }
        roleManager.releaseRole(role.id);
        return null;
    }

    await sleep(1000);

    // Générer et envoyer le message de test
    const testCode = generateRandomCode();
    const testMessage = `Hello world for ${groupName} group ${testCode}`;
    console.log(`${indent}📤 Message: "${testMessage}"`);

    try {
        await sendSelfbotMessage(SELFBOT_TOKEN, guild.id, channel.id, testMessage)
    } catch (error) {
        console.error(`${indent}❌ Erreur envoi message:`, error);
        // Retirer le rôle des membres avant de le libérer
        for (const member of members) {
            try {
                await member.roles.remove(role);
            } catch {
                // Ignorer les erreurs
            }
        }
        roleManager.releaseRole(role.id);
        return null;
    }

    // Attendre 5 secondes
    console.log(`${indent}⏳ Attente de 19 secondes...`);
    await sleep(19000);

    // Retirer la permission
    try {
        await channel.permissionOverwrites.edit(role, {
            ViewChannel: false
        });
        console.log(`${indent}🔒 Permission retirée`);
    } catch (error) {
        console.error(`${indent}⚠️  Erreur retrait permission:`, error);
    }

    // Vérifier UNE SEULE FOIS sur SearchHub (compte du selfbot)
    const messageIsLogged = await checkMessageInSearchHub(selfbotUserId, testCode);

    // Retirer le rôle de tous les membres et le libérer pour réutilisation
    console.log(`${indent}🧹 Retrait du rôle des membres...`);
    for (const member of members) {
        try {
            await member.roles.remove(role);
        } catch (error) {
            // Ignorer les erreurs silencieusement
        }
    }
    
    // Libérer le rôle pour qu'il puisse être réutilisé
    roleManager.releaseRole(role.id);

    // Si le message n'est PAS loggé, aucun logger dans ce groupe
    if (!messageIsLogged) {
        console.log(`${indent}✅ Aucun logger dans ce groupe`);
        return null;
    }

    // Si le message EST loggé et qu'on a 1 seul membre, c'est lui
    if (members.length === 1) {
        console.log(`${indent}🎯 LOGGER CONFIRMÉ: ${members[0]!.user.tag}`);
        return members[0]!;
    }

    // Sinon, subdiviser en 2 groupes et chercher récursivement
    const midPoint = Math.ceil(members.length / 2);
    const chunk1 = members.slice(0, midPoint);
    const chunk2 = members.slice(midPoint);

    console.log(`${indent}📊 Subdivision: Groupe A (${chunk1.length}) | Groupe B (${chunk2.length})`);

    // Chercher dans le premier chunk
    console.log(`${indent}➡️  Test du sous-groupe A...`);
    let logger = await detectLoggerInGroup(guild, channel, chunk1, `${groupName}_A`, selfbotUserId, roleManager, depth + 1);
    if (logger) return logger;

    // Chercher dans le second chunk
    console.log(`${indent}➡️  Test du sous-groupe B...`);
    logger = await detectLoggerInGroup(guild, channel, chunk2, `${groupName}_B`, selfbotUserId, roleManager, depth + 1);
    if (logger) return logger;

    return null;
}
