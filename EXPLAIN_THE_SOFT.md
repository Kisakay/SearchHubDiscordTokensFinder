# Explication du fonctionnement du programme

## Vue d'ensemble
Ce programme est conçu pour identifier les membres d'un serveur Discord qui utilisent des outils de logging (enregistrement des messages) en utilisant une technique de "divide and conquer" (diviser pour régner).

## Fonctionnement détaillé

### 1. Configuration initiale
- Le bot se connecte au serveur Discord ciblé
- Il récupère la liste complète de tous les membres du serveur
- Les membres sont divisés en plusieurs groupes égaux (ex: 1000 membres = 5 groupes de 200)

### 2. Création des rôles et du salon piège
- Le bot crée 5 rôles correspondants aux 5 groupes (Rôle 1, Rôle 2, etc.)
- Un salon spécial est créé
- Par défaut, tous les rôles ont une permission "Non" pour voir ce salon

### 3. Test de chaque groupe (boucle)
Pour chaque groupe successivement :

**Étape A : Exposition**
- Le groupe ciblé reçoit temporairement la permission de voir le salon
- Le selfbot envoie un message unique avec un code aléatoire (ex: "Hello world for group 1 code ABC123") 
### (searchhub indexe uniquement les messages de compte utilisateur)

**Étape B : Vérification externe**
- Après 5 secondes, la permission est révoquée (le groupe ne voit plus le salon)
- Le bot interroge SearchHub (un service de logging Discord externe) via une requête POST
- Il cherche si le message envoyé apparaît dans leur base de données

**Étape C : Analyse des résultats**
- Si le message n'apparaît PAS : le groupe est "clean", on passe au suivant
- Si le message APPARAÎT : cela signifie qu'au moins un membre du groupe utilise un outil de logging

### 4. Réduction progressive (dichotomie)
Quand un groupe contient un "logger" :
- Le groupe suspect est divisé en 2 sous-groupes
- Le même processus est répété sur chaque sous-groupe
- Cette division continue jusqu'à isoler le membre individuel responsable

### 5. Action finale
Une fois le membre identifié avec certitude :
- Le membre est automatiquement banni du serveur

## Principe de détection
Le programme exploite le fait que les outils de logging envoient les messages à des services tiers (comme SearchHub). En envoyant des messages visibles uniquement par des groupes spécifiques et en vérifiant s'ils apparaissent dans ces services, il peut déduire qui utilise ces outils.