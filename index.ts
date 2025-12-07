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
import * as fs from 'fs';
import * as path from 'path';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ]
});

const selfbot = new SelfBotClient()

const TOKEN: string = process.env.TOKEN!;
const GUILD_ID: string = process.env.GUILD_ID!;
const SELFBOT_TOKEN: string = process.env.SELFBOT_TOKEN!;

const PROGRESS_FILE = path.join(__dirname, 'detection_progress.json');

interface SearchHubMessage {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    content: string;
}

interface ProgressData {
    currentChunkIndex: number;
    currentDepth: number;
    currentGroupPath: string;
    channelId: string | null;
    membersToAnalyze: string[]; // IDs des membres
    analyzedMembers: string[]; // IDs des membres déjà analysés
    foundLoggers: string[]; // IDs des loggers trouvés
    activeRoles: string[]; // IDs des rôles actifs
    startTime: string;
    lastUpdate: string;
}

// Fonction pour sauvegarder la progression
function saveProgress(data: ProgressData): void {
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`[SAVE] Progression sauvegardée: chunk ${data.currentChunkIndex}, depth ${data.currentDepth}`);
    } catch (error) {
        console.error('[SAVE ERROR] Erreur lors de la sauvegarde:', error);
    }
}

// Fonction pour charger la progression
function loadProgress(): ProgressData | null {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
            const progress = JSON.parse(data) as ProgressData;
            console.log(`[LOAD] Progression chargée: chunk ${progress.currentChunkIndex}, depth ${progress.currentDepth}`);
            return progress;
        }
    } catch (error) {
        console.error('[LOAD ERROR] Erreur lors du chargement:', error);
    }
    return null;
}

// Fonction pour supprimer le fichier de progression
function clearProgress(): void {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            fs.unlinkSync(PROGRESS_FILE);
            console.log('[CLEAR] Fichier de progression supprimé');
        }
    } catch (error) {
        console.error('[CLEAR ERROR] Erreur lors de la suppression:', error);
    }
}

// Fonction pour nettoyer les rôles orphelins
async function cleanupOrphanRoles(guild: Guild, roleIds: string[]): Promise<void> {
    console.log(`[CLEANUP] Nettoyage de ${roleIds.length} rôles orphelins...`);
    for (const roleId of roleIds) {
        try {
            const role = await guild.roles.fetch(roleId);
            if (role) {
                await role.delete();
                console.log(`[CLEANUP] Rôle ${role.name} supprimé`);
            }
        } catch (error) {
            console.error(`[CLEANUP ERROR] Erreur lors de la suppression du rôle ${roleId}:`, error);
        }
    }
}

// Fonction pour générer un code aléatoire
function generateRandomCode(): string {
    return Math.random().toString(36).substring(2, 15);
}

// Fonction pour attendre
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fonction pour créer les chunks de membres
function chunkMembers(members: GuildMember[], chunkSize: number): GuildMember[][] {
    const chunks: GuildMember[][] = [];
    for (let i = 0; i < members.length; i += chunkSize) {
        chunks.push(members.slice(i, i + chunkSize));
    }
    return chunks;
}

// Fonction pour vérifier si le message apparaît dans SearchHub
async function checkSearchHub(userId: string, messageContent: string): Promise<boolean> {
    try {
        const data: SearchHubMessage[] | unknown = await searchDiscord(userId);

        if (Array.isArray(data)) {
            return data.some((item: SearchHubMessage) =>
                item.content && item.content.includes(messageContent)
            );
        }
        return false;
    } catch (error) {
        console.error('Erreur lors de la vérification SearchHub:', error);
        return false;
    }
}

// Fonction récursive pour trouver le logger (avec sauvegarde)
async function findLogger(
    guild: Guild,
    channel: TextChannel,
    members: GuildMember[],
    groupNumber: string | number,
    depth: number = 0,
    progress: ProgressData
): Promise<GuildMember | null> {
    console.log(`[Depth ${depth}] Analyse du groupe ${groupNumber} avec ${members.length} membres`);

    if (members.length === 0) {
        console.log('Aucun membre à analyser');
        return null;
    }

    // Si un seul membre, c'est le logger
    if (members.length === 1) {
        console.log(`Logger trouvé: ${members[0]?.user.tag} (${members[0]?.id})`);
        progress.foundLoggers.push(members[0]!.id);
        saveProgress(progress);
        return members[0]!;
    }

    // Créer un rôle temporaire pour ce groupe
    const roleName: string = `TestGroup_${groupNumber}_${depth}_${Date.now()}`;
    const role: Role = await guild.roles.create({
        name: roleName,
        permissions: []
    });

    console.log(`Rôle créé: ${roleName}`);
    progress.activeRoles.push(role.id);
    progress.currentDepth = depth;
    progress.currentGroupPath = String(groupNumber);
    saveProgress(progress);

    // Assigner le rôle à tous les membres du groupe
    for (const member of members) {
        try {
            await member.roles.add(role);
        } catch (error) {
            console.error(`Erreur lors de l'ajout du rôle à ${member.user.tag}:`, error);
        }
    }

    await sleep(1000);

    // Donner la permission de voir le canal au rôle
    await channel.permissionOverwrites.edit(role, {
        ViewChannel: true,
        ReadMessageHistory: true
    });

    await sleep(1000);

    // Générer et envoyer le message de test
    const testCode: string = generateRandomCode();
    const testMessage: string = `Hello world for group ${groupNumber} depth ${depth} - ${testCode}`;

    console.log(`Envoi du message de test: ${testMessage}`);
    let selfbotChannel = await selfbot.channels.fetch(channel.id).catch(() => null)

    await (selfbotChannel as TextBasedChannel)?.send(testMessage);

    // Attendre 5 secondes
    await sleep(5000);

    // Retirer la permission de voir le canal
    await channel.permissionOverwrites.edit(role, {
        ViewChannel: false
    });

    console.log('Permission retirée, vérification sur SearchHub...');

    // Vérifier sur SearchHub pour chaque membre
    const foundMembers: GuildMember[] = [];
    for (const member of members) {
        const isLogger: boolean = await checkSearchHub(member.id, testCode);
        if (isLogger) {
            console.log(`✓ Le message apparaît pour ${member.user.tag}`);
            foundMembers.push(member);
        }
        progress.analyzedMembers.push(member.id);
        saveProgress(progress);
        await sleep(500);
    }

    // Nettoyer le rôle
    for (const member of members) {
        try {
            await member.roles.remove(role);
        } catch (error) {
            console.error(`Erreur lors du retrait du rôle de ${member.user.tag}:`, error);
        }
    }
    await role.delete();
    progress.activeRoles = progress.activeRoles.filter(id => id !== role.id);
    console.log(`Rôle ${roleName} supprimé`);
    saveProgress(progress);

    // Si des loggers trouvés, subdiviser récursivement
    if (foundMembers.length > 0) {
        if (foundMembers.length === 1) {
            progress.foundLoggers.push(foundMembers[0]!.id);
            saveProgress(progress);
            return foundMembers[0]!;
        }

        // Subdiviser en 2 groupes
        const midPoint: number = Math.ceil(foundMembers.length / 2);
        const chunk1: GuildMember[] = foundMembers.slice(0, midPoint);
        const chunk2: GuildMember[] = foundMembers.slice(midPoint);

        console.log(`Subdivision en 2 groupes: ${chunk1.length} et ${chunk2.length} membres`);

        // Chercher dans le premier chunk
        let logger: GuildMember | null = await findLogger(guild, channel, chunk1, `${groupNumber}_1`, depth + 1, progress);
        if (logger) return logger;

        // Chercher dans le second chunk
        logger = await findLogger(guild, channel, chunk2, `${groupNumber}_2`, depth + 1, progress);
        if (logger) return logger;
    }

    return null;
}

// Fonction principale
async function detectLoggers(): Promise<void> {
    try {
        const guild: Guild = await client.guilds.fetch(GUILD_ID);
        console.log(`Connecté au serveur: ${guild.name}`);

        // Vérifier si une progression existe
        let progress = loadProgress();
        let channel: TextChannel;
        let chunks: GuildMember[][];
        let startChunkIndex = 0;

        if (progress) {
            console.log('\n🔄 REPRISE DE LA DÉTECTION EN COURS...');
            console.log(`Dernière mise à jour: ${progress.lastUpdate}`);
            console.log(`Chunk: ${progress.currentChunkIndex}, Depth: ${progress.currentDepth}`);
            console.log(`Loggers trouvés: ${progress.foundLoggers.length}`);
            
            // Nettoyer les rôles orphelins
            if (progress.activeRoles.length > 0) {
                await cleanupOrphanRoles(guild, progress.activeRoles);
                progress.activeRoles = [];
            }

            // Récupérer ou recréer le canal
            if (progress.channelId) {
                try {
                    channel = await guild.channels.fetch(progress.channelId) as TextChannel;
                    console.log(`Canal existant récupéré: ${channel.name}`);
                } catch {
                    console.log('Canal non trouvé, création d\'un nouveau...');
                    channel = await guild.channels.create({
                        name: 'searchhub-detection',
                        permissionOverwrites: [
                            {
                                id: guild.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            },
                            {
                                id: client.user!.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                            }
                        ]
                    }) as TextChannel;
                    progress.channelId = channel.id;
                }
            } else {
                channel = await guild.channels.create({
                    name: 'searchhub-detection',
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: client.user!.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        }
                    ]
                }) as TextChannel;
                progress.channelId = channel.id;
            }

            startChunkIndex = progress.currentChunkIndex;

            // Récupérer tous les membres
            await guild.members.fetch();
            const members: GuildMember[] = Array.from(guild.members.cache.values())
                .filter((m: GuildMember) => !m.user.bot);

            const chunkSize: number = Math.ceil(members.length / Math.ceil(members.length / 200));
            chunks = chunkMembers(members, chunkSize);

        } else {
            console.log('\n🆕 NOUVELLE DÉTECTION...');
            
            // Récupérer tous les membres
            await guild.members.fetch();
            const members: GuildMember[] = Array.from(guild.members.cache.values())
                .filter((m: GuildMember) => !m.user.bot);
            console.log(`${members.length} membres trouvés (hors bots)`);

            if (members.length === 0) {
                console.log('Aucun membre à analyser');
                return;
            }

            // Créer un salon de test
            channel = await guild.channels.create({
                name: 'searchhub-detection',
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: client.user!.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ]
            }) as TextChannel;

            console.log(`Canal créé: ${channel.name}`);

            const chunkSize: number = Math.ceil(members.length / Math.ceil(members.length / 200));
            chunks = chunkMembers(members, chunkSize);

            console.log(`${chunks.length} groupes créés avec ~${chunkSize} membres chacun`);

            // Initialiser la progression
            progress = {
                currentChunkIndex: 0,
                currentDepth: 0,
                currentGroupPath: '',
                channelId: channel.id,
                membersToAnalyze: members.map(m => m.id),
                analyzedMembers: [],
                foundLoggers: [],
                activeRoles: [],
                startTime: new Date().toISOString(),
                lastUpdate: new Date().toISOString()
            };
            saveProgress(progress);
        }

        // Analyser chaque groupe
        const loggers: GuildMember[] = [];
        for (let i = startChunkIndex; i < chunks.length; i++) {
            console.log(`\n=== Analyse du groupe ${i + 1}/${chunks.length} ===`);
            progress.currentChunkIndex = i;
            progress.lastUpdate = new Date().toISOString();
            saveProgress(progress);

            const logger: GuildMember | null = await findLogger(guild, channel, chunks[i]!, i + 1, 0, progress);

            if (logger) {
                loggers.push(logger);
                console.log(`\n🚨 LOGGER DÉTECTÉ: ${logger.user.tag} (${logger.id})`);

                // Bannir le membre
                try {
                    // await logger.ban({ reason: 'Logger de messages détecté via SearchHub' });
                    console.log(`✓ ${logger.user.tag} a été banni`);
                } catch (error) {
                    console.error(`✗ Erreur lors du bannissement de ${logger.user.tag}:`, error);
                }
            }

            await sleep(2000);
        }

        // Nettoyer le canal
        await channel.delete();
        console.log('\nCanal de test supprimé');

        console.log(`\n=== RÉSUMÉ ===`);
        console.log(`${loggers.length} logger(s) détecté(s) et banni(s)`);
        loggers.forEach((l: GuildMember) => console.log(`- ${l.user.tag} (${l.id})`));

        // Supprimer le fichier de progression une fois terminé
        clearProgress();

    } catch (error) {
        console.error('Erreur lors de la détection:', error);
        console.log('La progression a été sauvegardée. Redémarrez le bot pour continuer.');
    }
}

// Gérer l'arrêt gracieux
process.on('SIGINT', () => {
    console.log('\n\n🛑 Arrêt du bot détecté (Ctrl+C)');
    console.log('La progression a été sauvegardée dans detection_progress.json');
    console.log('Redémarrez le bot pour reprendre où vous vous êtes arrêté.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Arrêt du bot détecté (SIGTERM)');
    console.log('La progression a été sauvegardée dans detection_progress.json');
    process.exit(0);
});

client.once('clientReady', async () => {
    console.log(`Bot connecté en tant que ${client.user!.tag}`);
    await detectLoggers();
    console.log('\nDétection terminée. Le bot reste actif.');
});

selfbot.once("ready", () => {
    console.log("Selfbot connecter en tant que", selfbot.user?.username);
});

selfbot.login(SELFBOT_TOKEN);
client.login(TOKEN);