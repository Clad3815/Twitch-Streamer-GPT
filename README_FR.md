
[English version](README.md)

---
### 0.0.1. 🚨 Mise à jour Majeure - 06/08/2023 🚨
Mise à jour majeure vers la version 1.5. Veuillez vous assurer de tout réinstaller si vous mettez à jour depuis une version précédente. Vous pouvez conserver vos dossiers `prompts`, `wait_mp3`, `wake_word`, `wake_word_answer` ainsi que les fichiers `config.json` et `.env`.
0.1. Pour le fichier `.env`, vous devrez ajouter les variables manquantes. Vous pouvez les trouver dans le fichier `.env.example`.
---

# 1. Twitch Streamer GPT - Révolutionnez vos streams Twitch 🚀

Bienvenue dans **Twitch Streamer GPT** ! Cet outil incroyable apporte un tout nouveau niveau d'interactivité et de plaisir à vos streams Twitch. Que vous soyez un expert en technologie ou un débutant complet, vous pouvez facilement l'installer et commencer à vous amuser. Voici ce qu'il contient :

## 1.1. Table des Matières

- [1. Twitch Streamer GPT - Révolutionnez vos streams Twitch 🚀](#1-twitch-streamer-gpt---révolutionnez-vos-streams-twitch-)
  - [1.1. Table des Matières](#11-table-des-matières)
  - [1.2. Qu'est-ce qu'il peut faire ? 🎮](#12-quest-ce-quil-peut-faire--)
  - [1.3. Commencer - C'est Facile ! 🛠️](#13-commencer---cest-facile--️)
    - [1.3.1. Étape 1 : Installer les Logiciels Requis](#131-étape-1--installer-les-logiciels-requis)
    - [1.3.2. Étape 2 : Télécharger le Bot](#132-étape-2--télécharger-le-bot)
    - [1.3.3. Étape 3 : Personnaliser le Bot](#133-étape-3--personnaliser-le-bot)
    - [1.3.4. Étape 4 : Installer le Bot](#134-étape-4--installer-le-bot)
  - [1.4. Tutoriel de Configuration 🎓](#14-tutoriel-de-configuration-)
    - [1.4.1. Étape 1 : Personnaliser le Mot d'Éveil](#141-étape-1--personnaliser-le-mot-déveil)
    - [1.4.2. Étape 2 : Configurer les Réponses MP3](#142-étape-2--configurer-les-réponses-mp3)
    - [1.4.3. Étape 3 : Ajuster les Variables d'Environnement](#143-étape-3--ajuster-les-variables-denvironnement)
  - [1.5. Personnalisez la Personnalité de Votre Bot 🎭](#15-personnalisez-la-personnalité-de-votre-bot-)
  - [1.6. Besoin de Quelque Chose de Spécial ? 💼](#16-besoin-de-quelque-chose-de-spécial--)
  - [1.7. Besoin d'Aide ou des Idées ? 🙌](#17-besoin-daide-ou-des-idées--)
  - [1.8. Licence et Crédits 📜](#18-licence-et-crédits-)


## 1.2. Qu'est-ce qu'il peut faire ? 🎮

- **Parler avec vos spectateurs**: Répondre aux événements de chat tels que les abonnements, les cadeaux, etc.
- **Écouter et Répondre**: Utilisez un mot-clé spécial pour que le bot vous écoute et vous réponde.
- **Créer des sondages, des prédictions, et plus encore**: Demandez au bot d'effectuer des actions comme créer des sondages ou changer le titre de votre stream, le tout en conversation naturelle.


## 1.3. Commencer - C'est Facile ! 🛠️

### 1.3.1. Étape 1 : Installer les Logiciels Requis

Tout d'abord, vous aurez besoin de NodeJS et npm sur votre ordinateur. Ne vous inquiétez pas si vous ne les avez pas ; il suffit de [télécharger NodeJS ici](https://nodejs.org/), et il installera les deux pour vous.

### 1.3.2. Étape 2 : Télécharger le Bot

Cliquez [ici](https://github.com/Clad3815/Twitch-Streamer-GPT/archive/main.zip) pour télécharger les fichiers du bot. Une fois téléchargés, décompressez le dossier.

### 1.3.3. Étape 3 : Personnaliser le Bot

Dans le dossier décompressé, vous trouverez un fichier nommé `.env.example`. Ce fichier vous permet de personnaliser le bot. Renommez-le en `.env` et suivez le [Tutoriel de Configuration](#tutoriel-de-configuration-) pour le personnaliser.

### 1.3.4. Étape 4 : Installer le Bot

1. Ouvrez le dossier décompressé et trouvez le fichier nommé `install.bat`. Double-cliquez dessus, et il s'occupera de l'installation pour vous.

2. Une fois l'installation terminée, trouvez le fichier nommé `start_all.bat` et double-cliquez dessus pour démarrer le bot.

Votre bot fonctionne maintenant et est prêt à rendre vos streams plus interactifs et amusants !

## 1.4. Tutoriel de Configuration 🎓

La configuration de ce script comprend trois étapes simples : définir le "mot d'éveil", configurer les réponses mp3, et configurer les variables d'environnement nécessaires.

### 1.4.1. Étape 1 : Personnaliser le Mot d'Éveil

Le 'mot d'éveil' identifie un mot ou une phrase précise choisis par le streamer. Lorsqu'il est prononcé dans leur micro, cela incite l'application GPT à écouter et réagir indirectement à la commande du streamer, enrichissant l'interaction pendant le stream en direct.
Vous trouverez le fichier 'porcupine_params_*.pv' et plusieurs fichiers '.ppn' dans le répertoire 'wake_word'.

- **Fichier porcupine_params_*.pv**: Ce fichier est requis pour le moteur de mot d'éveil Picovoice. Il doit correspondre à la langue de vos mots d'éveil. Le script utilise automatiquement le premier fichier trouvé dans ce répertoire. Par défaut, le script inclut la langue française. Si vous souhaitez changer, supprimez `porcupine_params_fr.pv`, téléchargez la langue désirée [ici](https://github.com/Picovoice/porcupine/tree/master/lib/common), et placez-le dans le répertoire 'wake_word'.

- **Fichiers \*.ppn**: Ces fichiers incluent des modèles de mots d'éveil spécifiques. Vous pouvez personnaliser vos mots d'éveil sur la console Picovoice et ajouter autant de fichiers de mots d'éveil que nécessaire en les chargeant automatiquement dans le script. Les fichiers .ppn doivent correspondre à la langue de votre fichier porcupine_params.

Voici comment créer un nouveau fichier .ppn :

  1. Ouvrez la [Console Picovoice](https://console.picovoice.ai/). Inscrivez-vous si vous ne l'avez pas déjà fait.

  2. Naviguez jusqu'à Porcupine dans l'en-tête supérieur et remplissez les champs requis pour votre mot d'éveil.

  3. Cliquez sur 'Télécharger' pour télécharger votre mot d'éveil personnalisé au format `.ppn`. (Pour la compatibilité Windows, téléchargez les fichiers Windows.)

  4. Ajoutez le nouveau fichier de mot d'éveil au répertoire 'wake_word' de votre projet.

### 1.4.2. Étape 2 : Configurer les Réponses MP3

Le script déclenche des réponses mp3 pour deux actions - reconnaître le mot d'éveil et attendre une réponse d'OpenAI. Bien que vous puissiez utiliser n'importe quel fichier mp3, nous recommandons d'utiliser la synthèse vocale d'Elevenlabs pour plus de cohérence.

- **Fichiers Mp3 d'Attente**: Ces fichiers sont joués pendant que le bot attend une réponse d'OpenAI (pour les interactions avec les spectateurs, pas le mot d'éveil). Visitez [la synthèse vocale d'Elevenlabs](https://elevenlabs.io/speech-synthesis) pour créer vos fichiers et placez-les dans le répertoire 'wait_mp3' à la racine de votre projet.

- **Mp3 de Détection du Mot d'Éveil**: Les fichiers mp3 dans le répertoire 'wake_word_answer' sont joués après la reconnaissance du mot d'éveil. N'hésitez pas à ajouter un nombre illimité de fichiers mp3 ici, car le script en sélectionne un au hasard à chaque fois.


### 1.4.3. Étape 3 : Ajuster les Variables d'Environnement

Renommez d'abord le fichier `.env.example` en `.env`, puis ouvrez-le dans un éditeur de texte. Ce fichier contient toutes les variables d'environnement requises pour le fonctionnement du script.

Certains services comme OpenAI et Twitch API nécessitent des identifiants uniques pour l'authentification. Une fois que vous vous êtes inscrit à ces services et que vous avez reçu ces identifiants, ajoutez-les dans le fichier `.env` à la racine de votre projet.

Assurez-vous de remplir le fichier `.env` avec les détails d'identification précis de chaque service pour définir correctement les variables d'environnement.

**Important**: Comme il contient des données confidentielles, assurez-vous que le fichier `.env` est toujours caché pour éviter une utilisation inappropriée.

## 1.5. Personnalisez la Personnalité de Votre Bot 🎭

Vous voulez que votre bot ait une personnalité ou une façon de parler spécifique ? Vous pouvez facilement personnaliser ses réponses pour qu'elles correspondent à l'ambiance de votre stream.

Dans le dossier téléchargé, vous trouverez un fichier nommé `prompts/custom_instructions.txt`. Ce fichier contrôle la façon dont le bot répond à différents événements et commandes. En modifiant ce fichier, vous pouvez donner à votre bot une personnalité unique, lui indiquer comment répondre aux questions, et plus encore.

Voici un guide rapide pour vous aider :

1. **Ouvrez le Fichier**: Naviguez jusqu'au répertoire 'prompts' et ouvrez `custom_instructions.txt` dans un éditeur de texte comme le Bloc-notes.

2. **Modifiez les Instructions**: À l'intérieur, vous trouverez diverses instructions et directives qui guident le comportement du bot. N'hésitez pas à les modifier selon vos préférences. Par exemple, vous pouvez rendre le bot plus formel, ajouter de l'humour, etc. Par défaut, le bot est réglé pour être sarcastique et informel pour s'amuser.

3. **Enregistrez vos Modifications**: Une fois que vous avez terminé, enregistrez le fichier, et vos modifications seront automatiquement appliquées au bot.

4. **Redémarrez le Bot**: Si le bot est en cours d'exécution, redémarrez-le pour voir vos modifications en action.

Maintenant, votre bot répondra dans le style unique que vous avez créé. Amusez-vous à expérimenter et faites de votre bot quelque chose de vraiment unique !

## 1.6. Besoin de Quelque Chose de Spécial ? 💼

Si vous aimez le bot mais que vous voulez quelque chose d'encore plus spécial, je suis là pour vous aider ! Vous pouvez me contacter sur Discord à `clad3815` pour une version personnalisée adaptée spécialement pour vous.

## 1.7. Besoin d'Aide ou des Idées ? 🙌

Si vous rencontrez des problèmes ou si vous avez des idées pour améliorer encore le bot, veuillez [créer un problème](https://github.com/Clad3815/Twitch-Streamer-GPT/issues), et je me ferai un plaisir de vous aider.

## 1.8. Licence et Crédits 📜

Ce projet est sous licence MIT, et un grand merci à OpenAI, Elevenlabs, et Picovoice pour leurs technologies incroyables.

---

Rendez vos streams plus interactifs et amusants dès aujourd'hui avec **Twitch Streamer GPT** !

---
