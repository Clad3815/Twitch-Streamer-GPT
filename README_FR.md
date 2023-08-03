
[English version](README.md)

# Twitch Streamer GPT - Réinventer les streams Twitch

Apportez un nouveau niveau d'engagement et de plaisir à vos streams Twitch avec notre innovante application Twitch Streamer GPT. Cette solution basée sur NodeJS intègre une technologie avancée, incluant OpenAI, Twurple, Easy-Bot, et plus encore, pour créer une expérience de visionnage plus interactive et agréable pour votre audience Twitch.

L'outil est convivial et accessible aux utilisateurs de diverses compétences techniques. Effectuez l'installation complète avec facilité, quel que soit votre niveau de codage, en suivant notre guide simple. Ajoutez une touche unique à vos streams Twitch et gardez votre audience impatiente d'attendre votre prochaine diffusion !

Ce projet s'inspire du travail impressionnant de [AIAssistantStreamer](https://github.com/anisayari/AIAssistantStreamer/) par [Defend Intelligence](https://www.youtube.com/c/DefendIntelligence-tech).


## Table of Contents

- [Twitch Streamer GPT - Réinventer les streams Twitch](#twitch-streamer-gpt---réinventer-les-streams-twitch)
  - [Table of Contents](#table-of-contents)
  - [Information](#information)
  - [Pour commencer](#pour-commencer)
  - [Caractéristiques](#caractéristiques)
  - [Intégration avec OpenAI / GPT-3.5 Turbo ou GPT-4](#intégration-avec-openai--gpt-35-turbo-ou-gpt-4)
    - [Réponses personnalisées](#réponses-personnalisées)
  - [Quoi de neuf et d'excitant](#quoi-de-neuf-et-dexcitant)
      - [Annonces Text-to-Speech](#annonces-text-to-speech)
      - [Réactions aux redemptions de points et aux acclamations](#réactions-aux-redemptions-de-points-et-aux-acclamations)
      - [Activation des commandes vocales](#activation-des-commandes-vocales)
      - [Calibration et mises à jour régulières](#calibration-et-mises-à-jour-régulières)
  - [Tutoriel d'installation](#tutoriel-dinstallation)
    - [Étape 1 : Personnalisation du mot de réveil](#étape-1--personnalisation-du-mot-de-réveil)
    - [Étape 2 : Configuration des réponses MP3](#étape-2--configuration-des-réponses-mp3)
    - [Étape 3 : Ajustement des variables d'environnement](#étape-3--ajustement-des-variables-denvironnement)
  - [Portées du bot et du diffuseur Twitch](#portées-du-bot-et-du-diffuseur-twitch)
    - [Pour le bot :](#pour-le-bot-)
    - [Pour le diffuseur :](#pour-le-diffuseur-)
  - [Variables d'environnement essentielles](#variables-denvironnement-essentielles)
    - [OpenAI](#openai)
    - [Porcupine](#porcupine)
    - [ElevenLabs](#elevenlabs)
    - [Bot Twitch](#bot-twitch)
    - [Diffuseur Twitch](#diffuseur-twitch)
    - [Événements Twitch](#événements-twitch)
  - [Conclusion et Support](#conclusion-et-support)




## Information

Ce script sera régulièrement mis à jour pour ajouter de nouvelles fonctionnalités, corriger des bugs et améliorer l'expérience globale. Si vous avez des suggestions, n'hésitez pas à ouvrir un problème ou à me contacter sur Discord à "clad3815".

## Pour commencer

Embarquez dans cette aventure passionnante en quelques étapes simples :

1. Installez NodeJS et npm sur votre système. Si ce n'est pas installé, téléchargez NodeJS à partir de [ici](https://nodejs.org/en/download/).

2. Clonez ou téléchargez le dépôt sur votre machine locale :
    ```bash
    git clone https://github.com/Clad3815/Twitch-Streamer-GPT.git
    ```
    Vous n'êtes pas à l'aise avec le clonage ? Pas de soucis ! [Téléchargez la version zip du dépôt](https://github.com/Clad3815/Twitch-Streamer-GPT/archive/refs/heads/main.zip) et extrayez-le à un endroit approprié. C'est une alternative plus facile pour notre public non technique.

3. Naviguez vers le répertoire du dépôt :
    ```bash
    cd [NOM_DU_RÉPERTOIRE]
    ```
    Remplacez `[NOM_DU_RÉPERTOIRE]` par le nom de répertoire de votre choix.

4. Installez les dépendances requises :
    ```bash
    npm install
    ```
    Ou lancez le script `install.bat` pour installer les dépendances.

5. Démarrez le script (en arrière-plan)
    ```bash
    node index.js
    ```
    Ou lancez le script `start.bat` pour démarrer le script.


Voilà ! Votre propre script d'animation est en marche ! Préparez-vous maintenant à amplifier le plaisir et l'interactivité de vos streams Twitch.

## Caractéristiques

Notre script d'animation Twitch Streamer est soutenu par un large éventail de caractéristiques étonnantes :

* **Activation par mot de réveil** : Cette fonctionnalité permet au streamer d'activer certaines actions sur le stream en utilisant un mot-clé ou une phrase unique, appelé le "mot de réveil". Lorsque le streamer prononce cette phrase dans son microphone, l'application GPT écoute le microphone et répond, enrichissant les interactions sur le stream.
* **Transcription automatique de la parole** : Transcrivez efficacement tous vos discours, ouvrant la porte à des utilisations intéressantes.
* **Intégration de l'API Twitch** : Adoucit et améliore votre opération de diffusion en direct.
* **Interactivité vocale** : Maintient des conversations actives, animant votre stream.
* **Suivi des abonnements à la chaîne** : Surveille intelligemment tous vos abonnements à la chaîne.
* **Calibration en cours** : Le script s'adapte à votre environnement et offre des performances optimales.
* **Paramètres de commandes personnalisées** : Avec des options pour définir des commandes personnalisées, prenez le contrôle total de votre bot de streaming.

## Intégration avec OpenAI / GPT-3.5 Turbo ou GPT-4

Notre script présente une forte intégration avec le puissant modèle GPT-3.5 Turbo(ou GPT-4) d'OpenAI pour gérer des fonctionnalités interactives complexes. Le modèle génère des réponses basées sur les événements de diffusion en direct et les interactions en langage naturel avec les spectateurs.

Le modèle GPT-3.5 Turbo (ou GPT-4) prend en compte plusieurs entrées pour faire une réponse :

1. **Historique de chat** : L'historique des interactions jusqu'au point actuel aide à dériver des réponses qui s'adaptent parfaitement au contexte.

2. **État du stream** : Les détails du stream Twitch en cours assurent la pertinence des réponses générées.

3. **Détails de la chaîne et du bot** : Les informations sur le bot et la chaîne contribuent également à la génération de réponses.

Avec GPT-3.5 Turbo (ou GPT-4), les réponses générées sont non seulement contextuellement appropriées, mais engagent également le public avec de l'esprit et des conversations intéressantes.

### Réponses personnalisées

Vous pouvez fournir des instructions personnalisées au modèle GPT-3.5 Turbo (ou GPT-4) pour générer des réponses qui sont plus personnalisées et pertinentes pour votre stream.

Pour cela, modifiez le fichier `prompts/custom_instructions.txt` et ajoutez vos instructions personnalisées. Ces instructions seront injectées dans le modèle GPT-3.5 Turbo (ou GPT-4) pour générer des réponses. (Vous pouvez utiliser n'importe quelle langue que vous voulez)

## Quoi de neuf et d'excitant

#### Annonces Text-to-Speech

Accédez à des annonces TTS automatisées pour de nombreuses activités, telles que les nouvelles souscriptions, les acclamations, les resouscriptions, les souscriptions cadeaux, etc. Des messages uniques et pertinents au contexte sont composés en utilisant OpenAI GPT-3.5 Turbo (ou GPT-4) et sont convertis en parole en utilisant ElevenLabs TTS API.

#### Réactions aux redemptions de points et aux acclamations

Le script répond également à des événements spéciaux comme les acclamations et les redemptions de points. Vous obtenez des annonces TTS personnalisées, des réponses générées par OpenAI, et même des modifications dans les animations visuelles, ce qui donne une expérience engageante pour vos spectateurs.

Pour tirer le meilleur parti de cette fonctionnalité, notre script combine la puissance du modèle GPT-3.5 Turbo (ou GPT-4) d'OpenAI et de diverses API fournies dans le SDK Twitch et ElevenLabs.

#### Activation des commandes vocales

En utilisant le moteur de mots de réveil de Porcupine, notre application écoute des commandes vocales spécifiques pour déclencher une action. En prononçant votre mot de réveil personnalisé, vous activez l'intelligence artificielle pour écouter et répondre à votre commande. La commande vocale capturée est transcrite par le système Whisper ASR d'OpenAI, puis analysée par GPT-3.5 Turbo (ou GPT-4) pour initier une action appropriée. Cette fonctionnalité permet un stream dynamique et interactif.

#### Calibration et mises à jour régulières

Notre script se met à jour continuellement pour rester aligné avec l'état du stream en temps réel, assurant que l'expérience de streaming Twitch reste aussi dynamique que possible.


## Tutoriel d'installation

La mise en place de ce script implique trois étapes simples : définir le "Mot de réveil", configurer les réponses mp3, et configurer les variables d'environnement requises.

### Étape 1 : Personnalisation du mot de réveil

Le 'mot de réveil' identifie un mot ou une phrase précise choisie par le streamer. Lorsqu'il est prononcé dans leur microphone, cela incite l'application GPT à écouter et à réagir indirectement à la commande du streamer, enrichissant l'interaction pendant le stream en direct.
Vous pouvez trouver le fichier 'porcupine_params_*.pv' et plusieurs fichiers '.ppn' dans le répertoire 'wake_word'.

- **Fichier porcupine_params_*.pv** : Ce fichier est nécessaire pour le moteur de mots de réveil Picovoice. Il doit correspondre à la langue de vos mots de réveil. Le script utilise automatiquement le premier fichier trouvé dans ce répertoire. Par défaut, le script inclut la langue française. Si vous souhaitez changer, supprimez `porcupine_params_fr.pv`, téléchargez la langue souhaitée à partir de [ici](https://github.com/Picovoice/porcupine/tree/master/lib/common), et placez-le dans le répertoire 'wake_word'.

- **Fichiers \*.ppn** : Ces fichiers incluent des modèles de mots de réveil spécifiques. Vous pouvez personnaliser vos mots de réveil sur la console Picovoice et ajouter autant de fichiers de mots de réveil que nécessaire en les chargeant automatiquement dans le script. Les fichiers .ppn doivent correspondre à la langue de votre fichier porcupine_params.

Voici comment vous pouvez créer un nouveau fichier .ppn :

  1. Ouvrez la [Console Picovoice](https://console.picovoice.ai/). Inscrivez-vous, si vous ne l'avez pas déjà fait.

  2. Naviguez vers Porcupine sur l'en-tête supérieur et entrez les champs requis pour votre mot de réveil.

  3. Cliquez sur 'Télécharger' pour télécharger votre mot de réveil personnalisé au format `.ppn`. (Pour la compatibilité avec Windows, téléchargez les fichiers Windows.)

  4. Ajoutez le nouveau fichier de mot de réveil au répertoire 'wake_word' de votre projet.

### Étape 2 : Configuration des réponses MP3

Le script déclenche des réponses mp3 pour deux actions - reconnaissance du mot de réveil et attente d'une réponse de OpenAI. Bien que vous puissiez utiliser n'importe quel fichier mp3, nous recommandons d'utiliser la synthèse vocale de Elevenlabs pour une cohérence.

- **Fichiers Mp3 d'attente** : Ces fichiers sont lus pendant que le bot attend une réponse de OpenAI (pour les interactions des spectateurs, pas le mot de réveil). Visitez [la synthèse vocale de Elevenlabs](https://elevenlabs.io/speech-synthesis) pour créer vos fichiers et placez-les dans le répertoire 'wait_mp3' à la racine de votre projet.

- **Mp3 détecté par le mot de réveil** : Le(s) fichier(s) mp3 dans le répertoire 'wake_word_answer' est(sont) joué(s) après que le mot de réveil a été reconnu. N'hésitez pas à ajouter un nombre illimité de fichiers mp3 ici, car le script en sélectionne un au hasard à chaque fois.


### Étape 3 : Ajustement des variables d'environnement

Renommez d'abord le fichier `.env.example` en `.env` puis ouvrez-le dans un éditeur de texte. Ce fichier contient toutes les variables d'environnement nécessaires pour le fonctionnement du script.

Certains services comme OpenAI et Twitch API nécessitent des identifiants uniques pour l'authentification. Une fois que vous vous êtes inscrit à ces services et avez reçu ces identifiants, ajoutez-les dans le fichier `.env` à la racine de votre projet.

Assurez-vous de remplir le fichier `.env` avec des détails d'identification précis pour chaque service afin de définir correctement les variables d'environnement.

**Important** : Comme il contient des données confidentielles, assurez-vous que le fichier `.env` est toujours caché pour éviter une utilisation inappropriée.


## Portées du bot et du diffuseur Twitch

Pour configurer correctement vos informations d'identification d'application, incluez les portées nécessaires pour votre bot et votre diffuseur de Twitch.

### Pour le bot : 

Vous devrez inclure ces portées : 

- `chat:read` : Lire les messages de chat de tous les utilisateurs, y compris les utilisateurs dans les chaînes où le bot a été modéré.
- `chat:edit` : Envoyer des messages de chat et de chaîne.

### Pour le diffuseur :

Vous devrez inclure ces portées :

- `chat:read` : Lire les messages de chat de tous les utilisateurs, y compris les utilisateurs dans les chaînes où le bot a été modéré.
- `chat:edit` : Envoyer des messages de chat et de chaîne.
- `channel:read:redemptions` : Lire les objets de rédemption et lire toutes les rédemptions de récompenses personnalisées.
- `bits:read` : Lire les informations sur les Bits pour la chaîne.
- `channel_subscriptions` : Lire tous les abonnements à une chaîne.



## Variables d'environnement essentielles

Configurez le fichier `.env` avec les variables d'environnement suivantes :

### OpenAI

* **OPENAI_API_KEY** : Votre clé API d'OpenAI. Inscrivez-vous et obtenez votre clé API [ici](https://platform.openai.com/account/api-keys).

* **OPENAI_MODEL** : Spécifie le modèle à utiliser. Choisissez 'gpt-3.5-turbo' (économique) ou 'gpt-4' (de haute qualité mais plus cher).

* **OPENAI_BASEPATH** : Devrait être "https://api.openai.com/v1", sauf si nécessaire autrement.

* **OPENAI_MAX_TOKENS_TOTAL** : Le nombre maximum de tokens à envoyer à l'API. Plus le nombre de tokens est élevé, plus l'opération est coûteuse. Mettez à 0 pour la limite du modèle.

* **OPENAI_MAX_TOKENS_ANSWER** : Le nombre maximum de tokens que l'API retournera. Mettez à 0 pour aucune limite.

* **OPENAI_MODEL_TEMP** : Température du modèle entre 0 et 1. Une valeur plus élevée rendra les réponses plus aléatoires.

### Porcupine

* **PORCUPINE_API_KEY** : Votre clé API Porcupine. Porcupine est un moteur de mots de réveil, utilisé pour déclencher l'IA avec une commande vocale.

### ElevenLabs

* **ELEVENLABS_APIKEY** : Votre clé API pour le service ElevenLabs.

* **ELEVENLABS_VOICEID** : L'ID de voix choisi à partir de [ici](https://api.elevenlabs.io/v1/voices).

* **ELEVENLABS_VOICE_STABILITY** : Ajustez pour affiner la stabilité de la voix. Des valeurs plus élevées rendent la voix plus stable.

* **ELEVENLABS_VOICE_SIMILARITY_BOOST** : Ajustez pour améliorer la similitude avec la voix originale. Des valeurs plus élevées rendent la voix plus similaire.

### Bot Twitch 

* **TWITCH_BOT_ACCESS_TOKEN**, **TWITCH_BOT_REFRESH_TOKEN**, **TWITCH_BOT_CLIEND_ID** : Les détails de votre compte bot Twitch obtenus à partir de [Twitch Token Generator](https://twitchtokengenerator.com/).

* **TWITCH_BOT_USERNAME** : Le nom d'utilisateur du bot Twitch.

### Diffuseur Twitch 

* **TWITCH_BROADCASTER_ACCESS_TOKEN**, **TWITCH_BROADCASTER_REFRESH_TOKEN**, **TWITCH_BROADCASTER_CLIEND_ID** : Les détails du compte Twitch du diffuseur.

* **TWITCH_CHANNEL_NAME** : Le nom de votre chaîne Twitch à laquelle le bot se joindra.

* **TWITCH_POINT_REDEMPTIONS_TRIGGER** : Le nom de la rédemption de points Twitch déclenchant l'IA.

### Événements Twitch 

Activez ou désactivez des événements Twitch spécifiques en définissant la valeur correspondante à 1 (activer) ou 0 (désactiver) :

* **ENABLE_TWITCH_ONSUB**
* **ENABLE_TWITCH_ONRESUB**
* **ENABLE_TWITCH_ONSUBGIFT**
* **ENABLE_TWITCH_ONCOMMUNITYSUB**
* **ENABLE_TWITCH_ONPRIMEPAIDUPGRADE**
* **ENABLE_TWITCH_ONGIFTPAIDUPGRADE**
* **ENABLE_TWITCH_ONBITS**
* **ENABLE_TWITCH_ONREDEMPTION**

Avec toutes les variables d'environnement configurées dans votre fichier `.env`, votre script d'animation Twitch Streamer sera prêt à fonctionner !

Notre équipe est prête à vous aider si vous rencontrez des problèmes lors de l'installation.

Découvrez une nouvelle dimension de streaming Twitch avec notre script d'animation Twitch Streamer. Sortez de l'expérience de streaming conventionnelle, captivez votre public avec un charme unique et regardez votre chaîne de streaming grandir ! Essayez-le aujourd'hui et ressentez la transformation vous-même !

## Conclusion et Support

Bien que le script d'animation Twitch Streamer soit extrêmement polyvalent, si vous êtes un streamer qui a besoin d'une solution super personnalisée, je suis disponible ! Vous pouvez m'engager pour un accompagnement ou un support personnel. Il suffit de me contacter sur Discord à "clad3815".

Rejoignez notre script d'animation Twitch Streamer aujourd'hui, et soyez le game-changer dans le streaming Twitch. Élevez vos livestreams à un niveau de divertissement inégalé qui laisse votre public envoûté. Regardez la croissance de votre chaîne monter en flèche et le nombre d'abonnés se multiplier. Essayez-le et assistez à la révolution !