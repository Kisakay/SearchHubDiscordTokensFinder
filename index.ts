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

import {
    Client as SelfBotClient,
} from "discord.js-selfbot-v13";

import createChunks from './funcs/createChunks';
import sleep from './funcs/sleep';

import {
    clearProgress,
    saveProgress,
    loadProgress
} from './funcs/progress';

import createDetectionChannel from './funcs/createDetectionChannel';
import detectLoggerInGroup from './funcs/detectLoggerInGroup';

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ]
});

export const selfbot = new SelfBotClient();

const TOKEN: string = process.env.TOKEN!;
const GUILD_ID: string = process.env.GUILD_ID!;
const SELFBOT_TOKEN: string = process.env.SELFBOT_TOKEN!;

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