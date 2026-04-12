// All of the code was pretty Vibe-Coded. i modify it a bit. 
// was too lazy to code myself for SearchHub, So i prompted the algorithm of the code to Claude and Copy-Past the result
// (and fixed multiple error, fixes some shit and test if it work)
// rip bozo

import {
    Client,
    GatewayIntentBits,
    Guild,
    GuildMember,
    TextChannel,
} from 'discord.js';

import createChunks from './funcs/createChunks';
import sleep from './funcs/sleep';

import {
    getActiveRoleGroups,
    clearProgress,
    createNewProgress,
    getMainRoleGroups,
    getRootGroupId,
    markFoundLogger,
    markLegitUsers,
    saveProgress,
    loadProgress
} from './funcs/progress';

import createDetectionChannel from './funcs/createDetectionChannel';
import detectLoggerInGroup from './funcs/detectLoggerInGroup';
import getUserIdFromToken from './funcs/getIdFromToken';
import { MAIN_GROUP_SIZE, syncMembersWithGroupRole } from './funcs/groupRoles';

function getMembersFromIds(
    memberIds: string[],
    membersById: Map<string, GuildMember>
): GuildMember[] {
    return memberIds
        .map(memberId => membersById.get(memberId) ?? null)
        .filter((member): member is GuildMember => member !== null);
}

async function initializeMainGroups(
    guild: Guild,
    progress: ReturnType<typeof createNewProgress>,
    members: GuildMember[]
): Promise<GuildMember[][]> {
    const mainChunks = createChunks(members, MAIN_GROUP_SIZE);
    console.log(`📦 ${mainChunks.length} groupe(s) de ~${MAIN_GROUP_SIZE} membres créé(s)`);

    for (let index = 0; index < mainChunks.length; index++) {
        await syncMembersWithGroupRole(
            guild,
            progress,
            `${index + 1}`,
            mainChunks[index]!,
            0
        );
    }

    return mainChunks;
}

async function reconcileExistingGroups(
    guild: Guild,
    progress: ReturnType<typeof createNewProgress>,
    members: GuildMember[]
): Promise<GuildMember[][]> {
    const membersById = new Map(members.map(member => [member.id, member]));
    const mainGroups = getMainRoleGroups(progress);
    if (mainGroups.length === 0) {
        progress.roleGroups = [];
        saveProgress(progress);
        return initializeMainGroups(guild, progress, members);
    }

    const activeGroups = getActiveRoleGroups(progress);

    console.log(`♻️ Réconciliation de ${activeGroups.length} groupe(s) actif(s)...`);

    for (const activeGroup of activeGroups) {
        const existingMembers = getMembersFromIds(activeGroup.memberIds, membersById);
        await syncMembersWithGroupRole(
            guild,
            progress,
            activeGroup.id,
            existingMembers,
            activeGroup.depth
        );
    }

    const distributedGroups = mainGroups.map(group => ({
        id: group.id,
        directMemberIds: [...group.memberIds],
        aggregateMemberIds: [...group.memberIds]
    }));

    for (const activeGroup of activeGroups) {
        const rootGroupId = getRootGroupId(activeGroup.id);
        const distributedGroup = distributedGroups.find(group => group.id === rootGroupId);
        if (!distributedGroup || activeGroup.id === rootGroupId) {
            continue;
        }

        for (const memberId of activeGroup.memberIds) {
            if (!distributedGroup.aggregateMemberIds.includes(memberId)) {
                distributedGroup.aggregateMemberIds.push(memberId);
            }
        }
    }

    const assignedMembers = new Set(distributedGroups.flatMap(group => group.aggregateMemberIds));
    const unassignedMembers = members.filter(member => !assignedMembers.has(member.id));

    if (unassignedMembers.length > 0) {
        console.log(`➕ ${unassignedMembers.length} membre(s) sans groupe trouvé(s), répartition en cours...`);

        for (const member of unassignedMembers) {
            distributedGroups.sort((first, second) => first.aggregateMemberIds.length - second.aggregateMemberIds.length);
            distributedGroups[0]!.directMemberIds.push(member.id);
            distributedGroups[0]!.aggregateMemberIds.push(member.id);
        }
    }

    const mainChunks: GuildMember[][] = [];

    for (const group of distributedGroups) {
        const directMembers = getMembersFromIds(group.directMemberIds, membersById);
        await syncMembersWithGroupRole(
            guild,
            progress,
            group.id,
            directMembers,
            0
        );

        const aggregateMembers = getMembersFromIds(group.aggregateMemberIds, membersById);
        mainChunks.push(aggregateMembers);
    }

    return mainChunks;
}

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ]
});

export const TOKEN: string = process.env.TOKEN!;
export const GUILD_ID: string = process.env.GUILD_ID!;
export const SELFBOT_TOKEN: string = process.env.SELFBOT_TOKEN!;

async function detectLoggers(): Promise<void> {
    try {
        const guild: Guild = await client.guilds.fetch(GUILD_ID);
        console.log(`\n🔗 Connecté au serveur: ${guild.name}`);

        // ID du selfbot (nécessaire pour vérifier SearchHub)
        const selfbotUserId = getUserIdFromToken(SELFBOT_TOKEN);
        if (!selfbotUserId) {
            console.error('❌ Impossible de récupérer l\'ID du selfbot');
            return;
        }
        console.log(`👤 Selfbot ID: ${selfbotUserId}`);

        // Charger la progression
        let progress = loadProgress();
        let channel: TextChannel;
        let startGroupIndex = 0;

        if (progress && progress.channelId) {
            console.log('🔄 Reprise de la détection...');
            try {
                channel = await guild.channels.fetch(progress.channelId) as TextChannel;
                startGroupIndex = progress.currentMainGroup;
                console.log(`📍 Reprise au groupe ${startGroupIndex + 1}`);
            } catch {
                console.log('⚠️  Canal non trouvé, création d\'un nouveau...');
                channel = await createDetectionChannel(guild);
                progress.channelId = channel.id;
            }
        } else {
            console.log('🆕 Nouvelle détection...');
            channel = await createDetectionChannel(guild);
            progress = createNewProgress(channel.id);
        }

        saveProgress(progress);

        // Récupérer tous les membres
        console.log('📥 Récupération des membres...');
        await guild.members.fetch();
        const members = Array.from(guild.members.cache.values())
            .filter(m => !m.user.bot && m.id !== selfbotUserId); // Exclure bots ET selfbot
        console.log(`👥 ${members.length} membre(s) à analyser (hors bots)`);

        if (members.length === 0) {
            console.log('⚠️  Aucun membre à analyser');
            return;
        }

        const mainChunks = progress.roleGroups.length > 0
            ? await reconcileExistingGroups(guild, progress, members)
            : await initializeMainGroups(guild, progress, members);

        console.log(`📦 ${mainChunks.length} groupe(s) principal(aux) prêt(s) pour le check`);

        // Analyser chaque groupe principal
        const loggers: GuildMember[] = [];

        for (let i = startGroupIndex; i < mainChunks.length; i++) {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`🔍 GROUPE PRINCIPAL ${i + 1}/${mainChunks.length}`);
            console.log(`${'='.repeat(70)}`);

            progress.currentMainGroup = i;
            progress.lastUpdate = new Date().toISOString();
            saveProgress(progress);

            const logger = await detectLoggerInGroup(
                guild,
                channel,
                mainChunks[i]!,
                `${i + 1}`,
                progress,
                selfbotUserId,
                0
            );

            if (logger) {
                loggers.push(logger);
                markFoundLogger(progress, logger.id);
                saveProgress(progress);

                console.log(`\n🚨🚨🚨 LOGGER DÉTECTÉ 🚨🚨🚨`);
                console.log(`👤 Utilisateur: ${logger.user.tag}`);
                console.log(`🆔 ID: ${logger.id}`);

                // Bannir le logger
                try {
                    let owner: GuildMember | null = await guild.members.fetch("415909499208073216").catch(() => null);
                    if (owner) owner.send({content: `${new Date().getUTCDate()} logger searchhub trouvé: ${logger.user.id} (${logger.user.username})`})
                    // await logger.ban({ reason: 'Logger de messages détecté via SearchHub' });
                    console.log(`✅ ${logger.user.tag} a été BANNI`);
                } catch (error) {
                    console.error(`❌ Erreur lors du bannissement:`, error);
                }
            } else {
                markLegitUsers(progress, mainChunks[i]!.map(member => member.id));
                saveProgress(progress);
                console.log(`\n✅ Aucun logger dans le groupe ${i + 1}`);
            }

            await sleep(2000);
        }

        // Nettoyer
        console.log('\n🧹 Nettoyage du canal de test...');
        await channel.delete();

        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 RÉSUMÉ FINAL`);
        console.log(`${'='.repeat(70)}`);
        console.log(`🎯 ${loggers.length} logger(s) détecté(s) et banni(s):`);

        if (loggers.length > 0) {
            loggers.forEach(l => console.log(`  🔴 ${l.user.tag} (${l.id})`));
        } else {
            console.log(`  ✅ Aucun logger détecté`);
        }

        clearProgress();
        console.log('\n✅ Détection terminée avec succès !');
        process.exit(1);

    } catch (error) {
        console.error('\n❌ Erreur fatale:', error);
        console.log('💾 Progression sauvegardée. Redémarrez pour continuer.');
        process.exit(1);
    }
}

// ========== GESTION DES SIGNAUX ==========

process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt détecté (Ctrl+C)');
    console.log('💾 Progression sauvegardée dans detection_progress.json');
    console.log('🔄 Redémarrez le bot pour reprendre où vous vous êtes arrêté');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt détecté (SIGTERM)');
    console.log('💾 Progression sauvegardée');
    process.exit(0);
});

// ========== DÉMARRAGE ==========

client.once('clientReady', async () => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🤖 Bot Discord connecté: ${client.user!.tag}`);
    console.log(`${'='.repeat(70)}`);

    await detectLoggers();

});


client.login(TOKEN);
