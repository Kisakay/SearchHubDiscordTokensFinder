import {
    Client,
    GatewayIntentBits,
    PermissionFlagsBits,
    Guild,
    GuildMember,
    TextChannel,
    Role
} from 'discord.js';

import {
    Client as SelfBotClient,
    type TextBasedChannel
} from "discord.js-selfbot-v13";
import { searchDiscord } from './searchdiscord';


import createChunks from './funcs/createChunks';
import generateRandomCode from './funcs/generateRandomCode';
import sleep from './funcs/sleep';

import type { SearchHubMessage } from './types/SearchHubMessage';
import { clearProgress, saveProgress, loadProgress } from './funcs/progress';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ]
});

const selfbot = new SelfBotClient();

const TOKEN: string = process.env.TOKEN!;
const GUILD_ID: string = process.env.GUILD_ID!;
const SELFBOT_TOKEN: string = process.env.SELFBOT_TOKEN!;

// ========== VÉRIFICATION SEARCHHUB (1 SEULE REQUÊTE) ==========

async function checkMessageInSearchHub(selfbotUserId: string, testCode: string): Promise<boolean> {
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

// ========== DÉTECTION RÉCURSIVE PAR DICHOTOMIE ==========

async function detectLoggerInGroup(
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
    for (const member of members) {
        try {
            await member.roles.remove(role);
        } catch (error) {
            // Ignore les erreurs silencieuses
        }
    }

    try {
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

async function detectLoggers(): Promise<void> {
    try {
        const guild: Guild = await client.guilds.fetch(GUILD_ID);
        console.log(`\n🔗 Connecté au serveur: ${guild.name}`);

        // ID du selfbot (nécessaire pour vérifier SearchHub)
        const selfbotUserId = selfbot.user?.id;
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
            progress = {
                channelId: channel.id,
                currentMainGroup: 0,
                foundLoggers: [],
                startTime: new Date().toISOString(),
                lastUpdate: new Date().toISOString()
            };
            saveProgress(progress);
        }

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

        // Créer les chunks principaux (groupes de 200)
        const groupSize = 200;
        const mainChunks = createChunks(members, groupSize);
        console.log(`📦 ${mainChunks.length} groupe(s) de ~${groupSize} membres créé(s)`);

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
                `G${i + 1}`,
                selfbotUserId,
                0
            );

            if (logger) {
                loggers.push(logger);
                progress.foundLoggers.push(logger.id);
                saveProgress(progress);

                console.log(`\n🚨🚨🚨 LOGGER DÉTECTÉ 🚨🚨🚨`);
                console.log(`👤 Utilisateur: ${logger.user.tag}`);
                console.log(`🆔 ID: ${logger.id}`);

                // Bannir le logger
                try {
                    await logger.ban({ reason: 'Logger de messages détecté via SearchHub' });
                    console.log(`✅ ${logger.user.tag} a été BANNI`);
                } catch (error) {
                    console.error(`❌ Erreur lors du bannissement:`, error);
                }
            } else {
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

    } catch (error) {
        console.error('\n❌ Erreur fatale:', error);
        console.log('💾 Progression sauvegardée. Redémarrez pour continuer.');
    }
}

// ========== HELPER: CRÉER LE CANAL ==========

async function createDetectionChannel(guild: Guild): Promise<TextChannel> {
    return await guild.channels.create({
        name: 'chat-general',
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: client.user!.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ManageRoles
                ]
            }
        ]
    }) as TextChannel;
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

client.once('ready', async () => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🤖 Bot Discord connecté: ${client.user!.tag}`);
    console.log(`${'='.repeat(70)}`);
});

selfbot.once('ready', async () => {
    console.log(`👤 Selfbot connecté: ${selfbot.user?.username}`);
    console.log(`${'='.repeat(70)}\n`);

    // Attendre un peu que tout soit prêt
    await sleep(2000);

    // Lancer la détection
    await detectLoggers();

    console.log('\n✅ Processus terminé. Le bot reste actif.');
});

selfbot.login(SELFBOT_TOKEN);
client.login(TOKEN);