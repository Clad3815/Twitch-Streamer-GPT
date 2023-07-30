# Twitch Streamer GPT - Reinventing Twitch Streams

Bring a new level of engagement and enjoyability to your Twitch streams with our innovative Twitch Streamer GPT application. This NodeJS-based solution integrates advanced technology, including OpenAI, Twurple, Easy-Bot, and more, to create a more interactive and enjoyable viewing experience for your Twitch audience.

The tool is user-friendly and accessible to users of varying technical aptitude. Complete set-up with ease, regardless of your coding experience, by following our straightforward guide. Add a unique touch to your Twitch streams and keep your audience eagerly waiting for your next broadcast!

This project is inspired by the impressive work of [AIAssistantStreamer](https://github.com/anisayari/AIAssistantStreamer/) by [Defend Intelligence](https://www.youtube.com/c/DefendIntelligence-tech).


## Table of Contents

- [Twitch Streamer GPT - Reinventing Twitch Streams](#twitch-streamer-gpt---reinventing-twitch-streams)
  - [Table of Contents](#table-of-contents)
  - [Information](#information)
  - [Getting Started](#getting-started)
  - [Features](#features)
  - [Integration with OpenAI / GPT-3.5 Turbo or GPT-4](#integration-with-openai--gpt-35-turbo-or-gpt-4)
    - [Personalized Responses](#personalized-responses)
  - [What's New \& Exciting](#whats-new--exciting)
      - [Text-to-Speech Announcements](#text-to-speech-announcements)
      - [Point Redemptions \& Cheering Reactions](#point-redemptions--cheering-reactions)
      - [Voice Command Activation](#voice-command-activation)
      - [Regular Calibration and Updates](#regular-calibration-and-updates)
  - [Setup Tutorial](#setup-tutorial)
    - [Step 1: Customizing Wake Word](#step-1-customizing-wake-word)
    - [Step 2: Configuring MP3 Responses](#step-2-configuring-mp3-responses)
    - [Step 3: Tweaking Environment Variables](#step-3-tweaking-environment-variables)
  - [Essential Environment Variables](#essential-environment-variables)
    - [OpenAI](#openai)
    - [Porcupine](#porcupine)
    - [ElevenLabs](#elevenlabs)
    - [Twitch Bot](#twitch-bot)
    - [Twitch Broadcaster](#twitch-broadcaster)
    - [Twitch Events](#twitch-events)
  - [Conclusion and Support](#conclusion-and-support)


## Information

This script is going to be updated regularly to add new features, fix bugs, and improve the overall experience. If you have any suggestions, feel free to open an issue or contact me on Discord at "clad3815".

## Getting Started

Hop on this exciting journey with a few simple steps:

1. Install NodeJS and npm on your system. If not installed, download NodeJS from [here](https://nodejs.org/en/download/).

2. Clone or download the repository to your local machine:
    ```bash
    git clone https://github.com/Clad3815/Twitch-Streamer-GPT.git
    ```
    Not comfortable with cloning? No worries! Download the zip version of the repository and extract it at a suitable location. This is an easier alternative for our non-technical audience.

3. Navigate to the repository directory:
    ```bash
    cd [DIR_NAME]
    ```
    Replace `[DIR_NAME]` with your chosen directory name.

4. Install the required dependencies:
    ```bash
    npm install
    ```

5. Start the script (in background)
    ```bash
    npm start
    ```
    You can also start the script only in the console (will be closed when the console is closed) by running `node index.js` instead.


Voila! Your very own animation script is up and running! Now, gear up to amplify the fun and interactivity of your Twitch streams.

## Features

Our Twitch Streamer Animation Script is backed with a wide array of amazing features:

* **Wake Word Activation**: This feature allows the streamer to activate certain actions on the stream by using a unique keyword or phrase, referred to as the "wake word". Upon the streamer saying this phrase into their microphone, the GPT application listens to the microphone and responds, enriching the interactions on the stream.
* **Automatic Speech Transcription**: Efficiently transcribe all your speech, opening doors for interesting usage.
* **Twitch API Integration**: Smoothens and enhances your live stream operation.
* **Voice Interactivity**: Maintains active conversations, livening up your stream.
* **Channel Subscription Tracking**: Monitors all your channel subscriptions smartly.
* **Ongoing Calibration**: The script adapts to your environment and offers optimal performance.
* **Custom Command Settings**: With options to set custom commands, take full control over your streaming bot.

## Integration with OpenAI / GPT-3.5 Turbo or GPT-4

Our script features a strong integration with the powerful GPT-3.5 Turbo (or GPT-4) model from OpenAI to manage intricate interactive features. The model generates responses based on live stream events and natural language interactions with viewers.

The GPT-3.5 Turbo  (or GPT-4)  model takes several inputs into account for making a response:

1. **Chat History**: The interaction history till the current point helps derive responses that fit the context perfectly.

2. **Stream State**: Details of the ongoing Twitch stream ensure relevancy in the responses generated.

3. **Channel and Bot Details**: Information about the bot and channel also contributes to response generation.

With GPT-3.5 Turbo  (or GPT-4) , the responses generated are not only contextually apt but also engage the audience with wit and interesting conversations.

### Personalized Responses

You can provide custom instructions to the GPT-3.5 Turbo  (or GPT-4)  model to generate responses that are more personalized and relevant to your stream. 

To do that edit the file `prompts/custom_instructions.txt` and add your custom instructions. These instructions will be injected into the GPT-3.5 Turbo  (or GPT-4) model to generate responses. (You can use any language you want)

## What's New & Exciting

#### Text-to-Speech Announcements

Access automated TTS announcements for numerous activities, such as new subscriptions, cheers, resubscriptions, gift subscriptions, etc. Unique, context-relevant messages are composed by utilizing OpenAI GPT-3.5 Turbo (or GPT-4) and are converted into speech using ElevenLabs TTS API.

#### Point Redemptions & Cheering Reactions

The script also responds to special events like cheerings and point redemptions. You get personalized TTS announcements, OpenAI-generated responses, and even modifications in visual animations, resulting in an engaging experience for your viewers.

To make the best use of this feature, our script combines the prowess of OpenAI's GPT-3.5 Turbo (or GPT-4) model and various APIs provided in the Twitch and ElevenLabs SDK.

#### Voice Command Activation

Employing Porcupine's wake word engine, our application listens for specific voice commands to trigger an action. By saying your customized wake word, you activate the artificial intelligence to listen and respond to your command. The captured voice command is transcribed by OpenAI's Whisper ASR system, then analyzed by GPT-3.5 Turbo (or GPT-4) to initiate a suitable action. This feature allows for a dynamic and interactive stream.

#### Regular Calibration and Updates

Our script continuously updates itself to keep aligned with the real-time stream state, making sure the Twitch streaming experience remains as dynamic as possible.


## Setup Tutorial

Setting up this script involves three simple steps: defining the "Wake Word", setting up mp3 responses, and configuring the required environment variables.

### Step 1: Customizing Wake Word

The 'wake word' identifies a precise word or phrase chosen by the streamer. When spoken into their microphone, this cues the GPT application to listen and react indirectly to the streamer's command, enriching the interaction during the live stream.
You can find 'porcupine_params_*.pv' file and several '.ppn' files within the 'wake_word' directory.

- **porcupine_params_*.pv file**: This file is required for the Picovoice Wake Word engine. It needs to match the language of your wake words. The script automatically uses the first found file in this directory. By default, the script includes the French language. In case you wish to switch, delete `porcupine_params_fr.pv`, download the desired language from [here](https://github.com/Picovoice/porcupine/tree/master/lib/common), and place it into the 'wake_word' directory.

- **\*.ppn files**: These files include specific wakeup word models. You can customize your wake words on the Picovoice console and add as many wake word files as needed by auto-loading them into the script. The .ppn files must match the language of your porcupine_params file.

Here's how you can create a new .ppn file:

  1. Open the [Picovoice Console](https://console.picovoice.ai/). Sign up, if you haven't already.

  2. Navigate to Porcupine on the top header and enter the required fields for your wake word.

  3. Click 'Download' to download your custom wake word in `.ppn` format. (For Windows compatibility, download the Windows files.)

  4. Add the new wake word file to the 'wake_word' directory of your project.

### Step 2: Configuring MP3 Responses

The script triggers mp3 responses for two actions - recognizing the wake word and waiting for a response from OpenAI. Although you can use any mp3 file, we recommend using Elevenlabs' Speech Synthesis for consistency.

- **Wait Mp3 Files**: These files play while the bot awaits a response from OpenAI (for viewer interactions, not the wake word). Visit [Elevenlabs' Speech Synthesis](https://elevenlabs.io/speech-synthesis) to create your files and place them in the 'wait_mp3' directory in your project's root.

- **Wake Word Detected Mp3**: The mp3 file(s) in the 'wake_word_answer' directory play after the wake word is recognized. Feel free to add an unlimited number of mp3 files here, as the script selects one at random each time.


### Step 3: Tweaking Environment Variables

First rename the `.env.example` file to `.env` and then open it in a text editor. This file contains all the environment variables required for the script to function.

Some services like OpenAI and Twitch API need unique credentials for authentication. Once you register with these services and receive these credentials, add them into the `.env` file at the root of your project.

Be certain to fill in the `.env` file with accurate credential details for each service to set the environment variables correctly.

**Important**: As it contains confidential data, ensure the `.env` file is always kept hidden to prevent inappropriate use.


## Essential Environment Variables

Configure the `.env` file with the following environment variables:

### OpenAI

* **OPENAI_API_KEY**: Your API Key from OpenAI. Register and get your API key [here](https://platform.openai.com/account/api-keys).

* **OPENAI_MODEL**: Specifies the model to be used. Choose 'gpt-3.5-turbo' (cost-effective) or 'gpt-4' (high-quality but pricier).

* **OPENAI_BASEPATH**: Should be "https://api.openai.com/v1", unless needed otherwise.

* **OPENAI_MAX_TOKENS_TOTAL**: The max number of tokens to send to the API. The higher the number of tokens, the more expensive the operation becomes. Set to 0 for the model limit.

* **OPENAI_MAX_TOKENS_ANSWER**: The maximum number of tokens the API will return. Set to 0 for no limit.

* **OPENAI_MODEL_TEMP**: Temperature of the model between 0 and 1. A higher value will make the answers more random.

### Porcupine

* **PORCUPINE_API_KEY**: Your Porcupine API Key. Porcupine is a wake word engine, used to trigger the AI with a voice command.

### ElevenLabs

* **ELEVENLABS_APIKEY**: Your API Key for ElevenLabs service.

* **ELEVENLABS_VOICEID**: The chosen voice ID from [here](https://api.elevenlabs.io/v1/voices).

* **ELEVENLABS_VOICE_STABILITY**: Adjust to refine the voice’s stability. Higher values make the voice more stable.

* **ELEVENLABS_VOICE_SIMILARITY_BOOST**: Adjust to enhance similarity to the original voice. Higher values make the voice more similar.

### Twitch Bot 

* **TWITCH_BOT_ACCESS_TOKEN**, **TWITCH_BOT_REFRESH_TOKEN**, **TWITCH_BOT_CLIEND_ID**: Your Twitch bot account details obtained from [Twitch Token Generator](https://twitchtokengenerator.com/).

* **TWITCH_BOT_USERNAME**: Username of the Twitch bot.

### Twitch Broadcaster 

* **TWITCH_BROADCASTER_ACCESS_TOKEN**, **TWITCH_BROADCASTER_REFRESH_TOKEN**, **TWITCH_BROADCASTER_CLIEND_ID**: Details of the broadcaster’s Twitch account.

* **TWITCH_CHANNEL_NAME**: The name of your Twitch channel to which the bot will join.

* **TWITCH_POINT_REDEMPTIONS_TRIGGER**: The name of the Twitch points redemption triggering the AI.

### Twitch Events 

Activate or deactivate specific Twitch events by setting the corresponding value to 1 (activate) or 0 (deactivate):

* **ENABLE_TWITCH_ONSUB**
* **ENABLE_TWITCH_ONRESUB**
* **ENABLE_TWITCH_ONSUBGIFT**
* **ENABLE_TWITCH_ONCOMMUNITYSUB**
* **ENABLE_TWITCH_ONPRIMEPAIDUPGRADE**
* **ENABLE_TWITCH_ONGIFTPAIDUPGRADE**
* **ENABLE_TWITCH_ONBITS**
* **ENABLE_TWITCH_ONREDEMPTION**

With all environment variables configured in your `.env` file, your Twitch Streamer Animation Script will be ready to run!

Our team is readily available to assist if you encounter any problems during the setup.

Experience a new dimension of Twitch streaming with our Twitch Streamer Animation Script. Break away from the conventional streaming experience, captivate your audience with a unique charm and watch your streaming channel grow! Try it today and feel the transformation yourself!



## Conclusion and Support
Though the Twitch Streamer Animation Script is immensely versatile, if you're a streamer in need of a super-customized solution, I'm available! You can hire me for personal guidance or support. Just ping me on Discord at "clad3815".

Join hands with our Twitch Streamer Animation Script today, and be the game-changer in Twitch streaming. Elevate your livestreams to an unmatched realm of entertainment that leaves your audience spellbound. Watch your channel growth skyrocket and subscriber count multiply. Give it a spin and witness the revolution!