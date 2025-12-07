Searchhub est une plateforme qui log les messages avec des tokens sur des serveurs discord. Mon script doit les trouvers et les ban du serveur.

FAIT MOI UN BOT DISCORD QUI :

UTILISE DISCORD.JS
SUR UN SERVEUR DISCORD

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
Le bot envoie un message du style: "Hello world for {groupNumber} group {generatedChar}"
\\ generatedChar est un code au pif
5 seconde après enlève la dérogation

éxecute une requête :

await fetch("https://searchhub.vip/api/search/discord", {
    "credentials": "include",
    "headers": {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        "Sec-GPC": "1",
        "Alt-Used": "searchhub.vip",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Priority": "u=0"
    },
    "referrer": "https://searchhub.vip/search",
    "body": "{\"userId\":\"171356978310938624\",\"timezoneOffsetMinutes\":-60}",
    "method": "POST",
    "mode": "cors"
});

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