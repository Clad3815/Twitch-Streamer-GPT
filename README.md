
[Version française](README_FR.md)


---

### 0.0.1. 🚨 Major Update - 06/08/2023 🚨
Major update to version 1.5! Please make sure to reinstall everything if you are updating from a previous version. You can keep your `prompts`, `wait_mp3`, `wake_word`, `wake_word_answer` folders, and `config.json`, `.env` files.
For the `.env` file, you will need to add the missing variables. You can find them in the `.env.example` file.

---

# 1. Twitch Streamer GPT - Revolutionize Your Twitch Streams 🚀

Welcome to **Twitch Streamer GPT**! This amazing tool brings a whole new level of interactivity and enjoyment to your Twitch streams. Whether you're tech-savvy or a complete beginner, you can easily set it up and start having fun. Here's what's inside:

# 2. Table of contents

- [1. Twitch Streamer GPT - Revolutionize Your Twitch Streams 🚀](#1-twitch-streamer-gpt---revolutionize-your-twitch-streams-)
- [2. Table of contents](#2-table-of-contents)
  - [2.1. What Can It Do? 🎮](#21-what-can-it-do-)
  - [2.2. Get Started - It's Easy! 🛠️](#22-get-started---its-easy-️)
    - [2.2.1. Step 1: Install Required Software](#221-step-1-install-required-software)
    - [2.2.2. Step 2: Download the Bot](#222-step-2-download-the-bot)
    - [2.2.3. Step 3: Customize the Bot](#223-step-3-customize-the-bot)
    - [2.2.4. Step 4: Set Up the Bot](#224-step-4-set-up-the-bot)
  - [2.3. Setup Tutorial 🎓](#23-setup-tutorial-)
    - [2.3.1. Step 1: Customizing Wake Word](#231-step-1-customizing-wake-word)
    - [2.3.2. Step 2: Configuring MP3 Responses](#232-step-2-configuring-mp3-responses)
    - [2.3.3. Step 3: Tweaking Environment Variables](#233-step-3-tweaking-environment-variables)
  - [2.4. Customize Your Bot's Personality 🎭](#24-customize-your-bots-personality-)
  - [2.5. Need Something Special? 💼](#25-need-something-special-)
  - [2.6. Need Help or Have Ideas? 🙌](#26-need-help-or-have-ideas-)
  - [2.7. License and Credits 📜](#27-license-and-credits-)






## 2.1. What Can It Do? 🎮

- **Talk with Your Viewers**: Respond to chat events like subscriptions, gifts, and more.
- **Listen and Respond**: Use a special "wake word" to have the bot listen to you and talk back.
- **Create Polls, Predictions, and More**: Ask the bot to perform actions like creating polls or changing your stream title, all through natural conversation.


## 2.2. Get Started - It's Easy! 🛠️

### 2.2.1. Step 1: Install Required Software

First, you'll need NodeJS and npm on your computer. Don't worry if you don't have them; just [download NodeJS from here](https://nodejs.org/), and it will install both for you.

### 2.2.2. Step 2: Download the Bot

Click [here](https://github.com/Clad3815/Twitch-Streamer-GPT/archive/main.zip) to download the bot files. Once downloaded, unzip the folder.

### 2.2.3. Step 3: Customize the Bot

Inside the unzipped folder, you'll find a file named `.env.example`. This file lets you personalize the bot. Rename it to `.env` and follow the [Setup Tutorial](#setup-tutorial) to make it your own.

### 2.2.4. Step 4: Set Up the Bot

1. Open the unzipped folder and find the file named `install.bat`. Double-click it, and it will take care of the installation for you.

2. Once the installation is done, find the file named `start_all.bat` and double-click it to start the bot.

Your bot is now running and ready to make your streams more interactive and fun!

## 2.3. Setup Tutorial 🎓

Setting up this script involves three simple steps: defining the "Wake Word", setting up mp3 responses, and configuring the required environment variables.

### 2.3.1. Step 1: Customizing Wake Word

The 'wake word' identifies a precise word or phrase chosen by the streamer. When spoken into their microphone, this cues the GPT application to listen and react indirectly to the streamer's command, enriching the interaction during the live stream.
You can find 'porcupine_params_*.pv' file and several '.ppn' files within the 'wake_word' directory.

- **porcupine_params_*.pv file**: This file is required for the Picovoice Wake Word engine. It needs to match the language of your wake words. The script automatically uses the first found file in this directory. By default, the script includes the French language. In case you wish to switch, delete `porcupine_params_fr.pv`, download the desired language from [here](https://github.com/Picovoice/porcupine/tree/master/lib/common), and place it into the 'wake_word' directory.

- **\*.ppn files**: These files include specific wakeup word models. You can customize your wake words on the Picovoice console and add as many wake word files as needed by auto-loading them into the script. The .ppn files must match the language of your porcupine_params file.

Here's how you can create a new .ppn file:

  1. Open the [Picovoice Console](https://console.picovoice.ai/). Sign up, if you haven't already.

  2. Navigate to Porcupine on the top header and enter the required fields for your wake word.

  3. Click 'Download' to download your custom wake word in `.ppn` format. (For Windows compatibility, download the Windows files.)

  4. Add the new wake word file to the 'wake_word' directory of your project.

### 2.3.2. Step 2: Configuring MP3 Responses

The script triggers mp3 responses for two actions - recognizing the wake word and waiting for a response from OpenAI. Although you can use any mp3 file, we recommend using Elevenlabs' Speech Synthesis for consistency.

- **Wait Mp3 Files**: These files play while the bot awaits a response from OpenAI (for viewer interactions, not the wake word). Visit [Elevenlabs' Speech Synthesis](https://elevenlabs.io/speech-synthesis) to create your files and place them in the 'wait_mp3' directory in your project's root.

- **Wake Word Detected Mp3**: The mp3 file(s) in the 'wake_word_answer' directory play after the wake word is recognized. Feel free to add an unlimited number of mp3 files here, as the script selects one at random each time.


### 2.3.3. Step 3: Tweaking Environment Variables

First rename the `.env.example` file to `.env` and then open it in a text editor. This file contains all the environment variables required for the script to function.

Some services like OpenAI and Twitch API need unique credentials for authentication. Once you register with these services and receive these credentials, add them into the `.env` file at the root of your project.

Be certain to fill in the `.env` file with accurate credential details for each service to set the environment variables correctly.

**Important**: As it contains confidential data, ensure the `.env` file is always kept hidden to prevent inappropriate use.

## 2.4. Customize Your Bot's Personality 🎭

Want your bot to have a specific personality or way of speaking? You can easily customize its responses to fit your stream's vibe.

Inside the downloaded folder, you'll find a file named `prompts/custom_instructions.txt`. This file controls how the bot responds to different events and commands. By editing this file, you can give your bot a unique persona, instruct it how to answer questions, and more.

Here's a quick guide to help you out:

1. **Open the File**: Navigate to the 'prompts' directory and open `custom_instructions.txt` in a text editor like Notepad.

2. **Edit the Instructions**: Inside, you'll find various prompts and instructions that guide the bot's behavior. Feel free to modify them to suit your preferences. For example, you can make the bot speak more formally, add humor, etc. By default, the bot is set to be sarcastic and informal for fun.

3. **Save Your Changes**: Once you're done, save the file, and your changes will be automatically applied to the bot.

4. **Restart the Bot**: If the bot is running, restart it to see your changes in action.

Now your bot will respond in the unique style you've crafted. Have fun experimenting, and make your bot truly your own!


## 2.5. Need Something Special? 💼

If you love the bot but want something extra special, I'm here to help! You can contact me on Discord at `clad3815` for a customized version tailored just for you.

## 2.6. Need Help or Have Ideas? 🙌

If you run into any issues or have ideas to make the bot even better, please [create an issue](https://github.com/Clad3815/Twitch-Streamer-GPT/issues), and I'll be happy to help.

## 2.7. License and Credits 📜

This project is inspired by the impressive work of [AIAssistantStreamer](https://github.com/anisayari/AIAssistantStreamer/) by [Defend Intelligence](https://www.youtube.com/c/DefendIntelligence-tech).
This project is licensed under the MIT License, and a big shout-out goes to OpenAI, Elevenlabs, and Picovoice for their amazing technologies.

---

Make your streams more interactive and fun today with **Twitch Streamer GPT**!

---