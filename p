Searchhub est une plateforme qui log les messages avec des tokens sur des serveurs discord. Mon script doit les trouvers et les ban du serveur. Actuellement il fait un peu de la merde.
Revois le code avec cette logique précise:

FAIT MOI UN BOT DISCORD QUI :

UTILISE DISCORD.JS
SUR UN SERVEUR DISCORD

FAIT MOI UN SELFBOT QUI:

UTILISE DISCORD-JS-SELFBOT-V13

VAS CHECK LES MEMBRES SUR LE SERVEUR: VAS LES CHUNK EN PETIT GROUPE
exemple: Si 1000 membre: 5 groupe de 200.

Sur les 5 groupes: créer 5 rôle pour ces groupes:
Role 1: Groupe 1
Role 2: Groupe 2
...
Role 5: Groupe 5


Créer un salon: 
LES 5 RÔLES VONT AVOIR UNE DÉROGATION POUR NE PAS VOIR LES MESSAGES

On vas parcouir les groupe dans une boucle for:

Premier groupe:

Groupe 1 à une dérogation sur "OUI" pour voir les messages
Le selfbot envoie un message du style: "Hello world for {groupNumber} group {generatedChar}"
\\ generatedChar est un code au pif
5 seconde après enlève la dérogation

éxecute la fonction searchDiscord()

Check si le message_content apparait dans l'objet JSON de la réponse.

Qui est un array de {
            "id": string,
            "userId": string,
            "username": string,
            "displayName": string,
            "content": string,
...
}[]

Tu dois filter si le message_content y est:

Si oui:
    Re chunk le groupe en 2:
        Refaire le même traitement.
        Récuperer le chunk ou le message apparait
        Refaire le même traitement.
        Jusqu'à trouver le membre qui logs les message
        Puis le Ban