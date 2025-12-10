import type { Guild, Role } from "discord.js";

/**
 * Gestionnaire de rôles réutilisables pour éviter de spammer l'API Discord
 */
export class RoleManager {
    private roles: Role[] = [];
    private usedRoles: Set<string> = new Set();
    private readonly rolePrefix = "Test_Chunk_";
    private readonly maxRoles: number;

    constructor(private guild: Guild, maxRoles: number = 50) {
        this.maxRoles = maxRoles;
    }

    /**
     * Initialise le pool de rôles en récupérant les rôles existants ou en créant de nouveaux
     */
    async initialize(): Promise<void> {
        console.log('🔧 Initialisation du gestionnaire de rôles...');
        
        // Récupérer les rôles existants avec le préfixe
        const existingRoles = (await this.guild.roles.fetch())
            .filter(role => role.name.startsWith(this.rolePrefix))
            .sort((a, b) => a.name.localeCompare(b.name))
            .toArray();

        console.log(`📋 ${existingRoles.length} rôle(s) existant(s) trouvé(s)`);

        // Si on a déjà assez de rôles, les réutiliser
        if (existingRoles.length >= this.maxRoles) {
            this.roles = existingRoles.slice(0, this.maxRoles);
            console.log(`✅ Réutilisation de ${this.roles.length} rôle(s) existant(s)`);
        } else {
            // Réutiliser les existants et créer les manquants
            this.roles = existingRoles;
            const rolesToCreate = this.maxRoles - existingRoles.length;
            console.log(`➕ Création de ${rolesToCreate} nouveau(x) rôle(s)...`);

            for (let i = existingRoles.length; i < this.maxRoles; i++) {
                try {
                    const role = await this.guild.roles.create({
                        name: `${this.rolePrefix}${i + 1}`,
                        permissions: [],
                        reason: 'Rôle réutilisable pour la détection de loggers'
                    });
                    this.roles.push(role);
                    await this.delay(200); // Petit délai pour éviter le rate limit
                } catch (error) {
                    console.error(`❌ Erreur lors de la création du rôle ${i + 1}:`, error);
                }
            }
            console.log(`✅ Pool de ${this.roles.length} rôle(s) initialisé`);
        }
    }

    /**
     * Obtient un rôle disponible du pool
     */
    async getAvailableRole(): Promise<Role | null> {
        // Chercher un rôle non utilisé
        for (const role of this.roles) {
            if (!this.usedRoles.has(role.id)) {
                this.usedRoles.add(role.id);
                return role;
            }
        }

        // Si tous les rôles sont utilisés, réutiliser le premier (cycle)
        if (this.roles.length > 0) {
            const role = this.roles[0]!;
            this.usedRoles.add(role.id);
            console.log('⚠️  Tous les rôles sont utilisés, réutilisation du premier rôle');
            return role;
        }

        return null;
    }

    /**
     * Libère un rôle pour qu'il puisse être réutilisé
     */
    releaseRole(roleId: string): void {
        this.usedRoles.delete(roleId);
    }

    /**
     * Nettoie tous les rôles du pool (suppression)
     */
    async cleanup(): Promise<void> {
        console.log('🧹 Nettoyage des rôles...');
        for (const role of this.roles) {
            try {
                await role.delete({ reason: 'Nettoyage après détection de loggers' });
                await this.delay(200); // Petit délai pour éviter le rate limit
            } catch (error) {
                console.error(`⚠️  Erreur lors de la suppression du rôle ${role.name}:`, error);
            }
        }
        this.roles = [];
        this.usedRoles.clear();
        console.log('✅ Nettoyage des rôles terminé');
    }

    /**
     * Nettoie uniquement les rôles non utilisés (pour libérer de l'espace)
     */
    async cleanupUnusedRoles(): Promise<void> {
        const unusedRoles = this.roles.filter(role => !this.usedRoles.has(role.id));
        console.log(`🧹 Nettoyage de ${unusedRoles.length} rôle(s) non utilisé(s)...`);
        
        for (const role of unusedRoles) {
            try {
                await role.delete({ reason: 'Nettoyage des rôles non utilisés' });
                await this.delay(200);
            } catch (error) {
                console.error(`⚠️  Erreur lors de la suppression du rôle ${role.name}:`, error);
            }
        }

        // Retirer les rôles supprimés de la liste
        this.roles = this.roles.filter(role => this.usedRoles.has(role.id));
    }

    /**
     * Réinitialise l'état des rôles utilisés (pour une nouvelle analyse)
     */
    reset(): void {
        this.usedRoles.clear();
        console.log('🔄 État des rôles réinitialisé');
    }

    /**
     * Retourne le nombre de rôles disponibles
     */
    getAvailableCount(): number {
        return this.roles.length - this.usedRoles.size;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

