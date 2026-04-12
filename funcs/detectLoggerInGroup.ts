import type { Guild, GuildMember, Role, TextChannel } from "discord.js";

import checkMessageInSearchHub from "./checkMessageInSearchHub";
import generateRandomCode from "./generateRandomCode";
import sleep from "./sleep";
import { sendSelfbotMessage } from "./sendSelfbotMessage";
import { SELFBOT_TOKEN } from "..";
import type { ProgressData } from "../types/ProgressData";
import { syncMembersWithGroupRole } from "./groupRoles";

export default async function detectLoggerInGroup(
    guild: Guild,
    channel: TextChannel,
    members: GuildMember[],
    groupName: string,
    progress: ProgressData,
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

    let role: Role;

    try {
        const syncedGroup = await syncMembersWithGroupRole(
            guild,
            progress,
            groupName,
            members,
            depth,
            indent
        );

        role = syncedGroup.role;
        console.log(`${indent}📝 Rôle réutilisé: ${role.name} (${role.id})`);
    } catch (error) {
        console.error(`${indent}❌ Erreur création/récupération rôle:`, error);
        return null;
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
        return null;
    }

    // Attendre 5 secondes
    console.log(`${indent}⏳ Attente de 10 secondes...`);
    await sleep(10000);

    // Retirer la permission
    try {
        await channel.permissionOverwrites.edit(role, {
            ViewChannel: false,
            ReadMessageHistory: false
        });
        console.log(`${indent}🔒 Permission retirée`);
    } catch (error) {
        console.error(`${indent}⚠️  Erreur retrait permission:`, error);
    }

    // Vérifier UNE SEULE FOIS sur SearchHub (compte du selfbot)
    const messageIsLogged = await checkMessageInSearchHub(selfbotUserId, testCode);

    console.log(`${indent}🧹 Rôle conservé pour les prochains checks`);

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
    let logger = await detectLoggerInGroup(
        guild,
        channel,
        chunk1,
        `${groupName}_A`,
        progress,
        selfbotUserId,
        depth + 1
    );
    if (logger) return logger;

    // Chercher dans le second chunk
    console.log(`${indent}➡️  Test du sous-groupe B...`);
    logger = await detectLoggerInGroup(
        guild,
        channel,
        chunk2,
        `${groupName}_B`,
        progress,
        selfbotUserId,
        depth + 1
    );
    if (logger) return logger;

    return null;
}
