# SearchHubDiscordTokensFinder

# Explication

Ce repositories GitHub permet de détecter et de bannir les tokens discord de [SearchHub](https://searchhub.vip) sur votre serveur discord. 

En effet, vous êtes sensé savoir que discord est maintenant une terre hostile à la confidentialité de votre vie privée. Ne serait-ce la plate-forme qui elle même log absolument toute activité et qui vous empêche même, ilégalement de vous laissez supprimer vos messages [source](https://github.com/victornpb/undiscord/discussions/429).

Et même maintenant, où les utilisateurs de la plateforme indèxe, sauvegarde, traque vos moindres fait-et-gestes au seins de serveur discord publique. C'est devenue monnaie courrante de voir des plateformes complètement ilégal comme SearchHub d'apparaître, et contre une maudite somme d'argent telle que 5€, pouvoir avoir accès à tant d'informations personnelle sur n'importe qui, si précieuse soit-t'elle.

## Il faut pouvoir dire stop!

Pourquoi ce laissez faire? Hein, sérieusement, il faut savoir dire non à ce genre de choses. Cela devrait nous choquer, nous choquer de voir que maintenant, des personnes lambdas ai l'accès à votre intimité préciseuse-soit-t'elle dans leur infrastructure ilégal.

# le combat

Je sais que je combat à mains nue face à la puissance redoutable de leur industrie. mais si vous, vous aussi, vous en avez marre que votre vie privée, vos messages, votre liberté soit réprimée par des personnes qui difusent au grand publique vos moindres messages. Alors oui, le combat est légitime. 

# comment lutter efficacement

Il n'y as pas vraiment de moyen possible pour lutter (À GRANDE ÉCHELLE). SearchHub, comme tant d'autres, indèxe vos serveurs d'une manière très efficace.

Regarde les discovery, inspecte les status des gens sur des serveurs publique pour trouver des status avec des liens d'invitation, y fait rejoindre des tokens, puis récursivement re-inspecte les bios....

cette méchanique est industriel.

Alors comment lutter, comment contrer ces attaques massive contre votre droit le plus fondamental, celui d'avoir une vie privée?

c'est pour cela que ce repositories github existe.

# Filtrer à l'entrer les comptes discord qui rejoins votre serveur

Comme je l'ai dis en haut, l'arrivées de token sur votre serveur discord est une évidante réalité. Pour les bloquer, il vas falloir passez votre serveur discord en "Apply to Join"

Déjà commencer par mettre votre serveur en profil privée, cela empêchera SearchHub d'indexer votre serveur via les emojis, ou les tags discord

![img tip1](./img/tip1.png)

Ensuite, voilà où il faudras allez pour activer le "Apply To Join"

![img tip2](./img/tip2.png)

Le apply to join est un système sous forme de question personalisable que vous pourrais demander au nouveau arrivant. Il seront placer dans une fil d'attente, et ne seront pas sur le serveur discord en attendant. Il n'auront pas l'accès aux messages et contenue privée du serveur. Bien évidèment il pourrons très bien répondre aux réponses si leur programme est bien dévelopée, c'est pour cela que vous pourrais inspecter leur profil. (Date de création de compte trop récente, photo de profil récurante, bio trop "robotisé", les connections, etc). Vous pouvez même créer un groupe avec le membre pour lui poser plus de questions si vous avez des doutes

# Trouver et éliminer les tokens

Nous voilà au plat de résistance ! ce repositories github vas vous permettre de troué le cul à ces batards... De bannir les tokens discord se trouvant dans votre serveur. Comment fonctionne ce programme?
Très simple, voici une explication:

[explication](./EXPLAIN_THE_SOFT.md)

# prêt à vous battre? Let's go

Bon, pour vous battre contre eux, vas falloir les engraisser un peu. Il vas vous falloir l'accès à leur service pour avoir accès à leur API pour déduir le token sur votre serveur. je vous laisse trouver comment faire pour payer!

## étape numéro 2 - récupérer vos cookies de session sur le site de searchhub

Sur firefox: 

Exemple:
![img tip2](./img/tip3.png)

Ensuite avec vos cookies dans le presser papier, créer un fichier appeler `cookies.txt` dans la racine du dossier.

Telle que:

![img tip2](./img/tip4.png)


## étape numéro 3 - commencer la configuration du fichier d'environnement

Rénommer `.env.example` en `.env`.

Dans le .env
```env
GUILD_ID="ID DU SERVEUR"
TOKEN="TOKEN DU BOT"
SELFBOT_TOKEN = "TOKEN DE VOTRE COMPTE DISCORD"
```

- Copier l'identifiant de votre serveur
![img tip2](./img/tip5.png)
Si vous n'avez pas le bouton "Copy Server ID" allez dans: paramètre utilisateur > Advanced/Paramètre Avancer > Mode développeur > Activé-le

- Récuperer le token d'un bot ALLEZ VOIR [CETTE DOCUMENTATION](https://docs.ihorizon.org/token-setup/create-token/)

- récuperer le token de votre compte discord [CETTE DOCUMENTATION](https://gist.github.com/MarvNC/e601f3603df22f36ebd3102c501116c6)

Il est nécessaire d'avoir du bon sens, et de savoir utiliser un peu un ordinateur avant de faire ceci.

### étape numéro 4 - installer le Runtime BunJS pour lancer le programme

J'utilises BUN en développement, mon code contient des fonctions utilisable seulement avec Bun. donc pas de nodejs

[Vous trouverez un tutoriel simple pour l'installation de bun ici](https://bun.sh/)

# Puis voilà, suffit de lire le terminal

Cela prend du temps, plus vous avez de membres sur votre serveur discord, plus sa seras long.