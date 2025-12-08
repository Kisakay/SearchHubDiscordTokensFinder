import type { Guild, GuildMember, Role, TextChannel } from "discord.js";
import type { TextBasedChannel } from "discord.js-selfbot-v13";

import { selfbot } from "..";
import checkMessageInSearchHub from "./checkMessageInSearchHub";
import generateRandomCode from "./generateRandomCode";
import sleep from "./sleep";

export default async function detectLoggerInGroup(
    guild: Guild,
    channel: TextChannel,
    members: GuildMember[],
    groupName: string,
    selfbotUserId: string,
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

    // Créer un rôle temporaire pour ce groupe
    const roleName = `Test_${groupName}_${Date.now()}`;
    let role: Role;

    try {
        role = await guild.roles.create({
            name: roleName,
            permissions: []
        });
        console.log(`${indent}📝 Rôle créé: ${roleName}`);
    } catch (error) {
        console.error(`${indent}❌ Erreur création rôle:`, error);
        return null;
    }

    // Assigner le rôle à tous les membres du groupe
    console.log(`${indent}👥 Attribution du rôle aux ${members.length} membres...`);
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
        await role.delete();
        return null;
    }

    await sleep(1000);

    // Générer et envoyer le message de test
    const testCode = generateRandomCode();
    const testMessage = `Hello world for ${groupName} group ${testCode}`;
    console.log(`${indent}📤 Message: "${testMessage}"`);

    try {
        const selfbotChannel = await selfbot.channels.fetch(channel.id).catch(() => null);
        if (!selfbotChannel) {
            console.error(`${indent}❌ Canal non accessible par le selfbot`);
            await role.delete();
            return null;
        }
        await (selfbotChannel as TextBasedChannel).send(testMessage);
    } catch (error) {
        console.error(`${indent}❌ Erreur envoi message:`, error);
        await role.delete();
        return null;
    }

    // Attendre 5 secondes
    console.log(`${indent}⏳ Attente de 5 secondes...`);
    await sleep(5000);

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

    // Nettoyer le rôle
    console.log(`${indent}🧹 Nettoyage du rôle...`);

    try {
        console.log(`${indent}🚮 Suppression du rôle...`);
        await role.delete();

    } catch (error) {
        console.error(`${indent}⚠️  Erreur suppression rôle`);
    }

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
    let logger = await detectLoggerInGroup(guild, channel, chunk1, `${groupName}_A`, selfbotUserId, depth + 1);
    if (logger) return logger;

    // Chercher dans le second chunk
    console.log(`${indent}➡️  Test du sous-groupe B...`);
    logger = await detectLoggerInGroup(guild, channel, chunk2, `${groupName}_B`, selfbotUserId, depth + 1);
    if (logger) return logger;

    return null;
}
