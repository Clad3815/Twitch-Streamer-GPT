// Import required modules
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Bot, createBotCommand } = require('@twurple/easy-bot');
const { StaticAuthProvider } = require('@twurple/auth');
const { PubSubClient } = require('@twurple/pubsub');
const { ApiClient } = require('@twurple/api');
const { OpenAIApi, Configuration } = require('openai');
const { Porcupine } = require('@picovoice/porcupine-node');
const { PvRecorder } = require("@picovoice/pvrecorder-node");
const { WaveFile } = require('wavefile');
const voiceHandler = require("./voiceHandler.js");
const readline = require('readline');
const { GPTTokens } = require("gpt-tokens");
// Load environment variables
dotenv.config();

let porcupineHandle;
// Set up constants
const AIModel = process.env.OPENAI_MODEL;
const botUsername = process.env.TWITCH_BOT_USERNAME;
const clientId = process.env.TWITCH_BOT_CLIEND_ID;
const accessToken = process.env.TWITCH_BOT_ACCESS_TOKEN;
const refreshToken = process.env.TWITCH_BOT_REFRESH_TOKEN;
const channelName = process.env.TWITCH_CHANNEL_NAME;

const broadcasterClientId = process.env.TWITCH_BROADCASTER_CLIEND_ID;
const broadcasterAccessToken = process.env.TWITCH_BROADCASTER_ACCESS_TOKEN;

const redemptionTrigger = process.env.TWITCH_POINT_REDEMPTIONS_TRIGGER;
const giftCounts = new Map();



const MAX_TOKENS = { // Define the maximum tokens for each model
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16384,
    'gpt-4': 8192,
    'gpt-4-32k': 32768
};

// Initialize OpenAI API
const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    basePath: process.env.OPENAI_BASEPATH,
}))

// Initialize Twitch API and PubSub clients
const authProvider = new StaticAuthProvider(clientId, accessToken);
const apiClient = new ApiClient({ authProvider });

const broadcasterAuthProvider = new StaticAuthProvider(broadcasterClientId, broadcasterAccessToken);
const broadcasterApiClient = new ApiClient({ authProvider: broadcasterAuthProvider });
const pubSubClient = new PubSubClient({ authProvider: broadcasterAuthProvider });


// Initialize variables
let history = [];
let streamInfos = {
    "gameName": "Just Chatting",
    "title": "Stream not started",
    "viewers": 0,
    "followers": 0,
    "description": "",
};

let voiceData = null;

let SILENCE_THRESHOLD;
const CONFIG_FILE = './config.json';

const MAX_SILENCE_FRAMES = 25;

let recorder;
let recordingFrames = [];
let isRecording = false;

let showChooseMic = true;


function loadWakeWord() {
    const directoryPath = path.resolve(__dirname, 'wake_word');
    let files = fs.readdirSync(directoryPath);
    let modelFile = files.find(file => file.startsWith('porcupine_params_') && file.endsWith('.pv'));
    let keywordFiles = files.filter(file => file.endsWith('.ppn'));
    if (!modelFile) {
        throw new Error("No matching file found");
    }
    if (keywordFiles.length === 0) {
        throw new Error('No .ppn files found');
    }
    let keywordPaths = keywordFiles.map(file => path.resolve(directoryPath, file));
    const MY_MODEL_PATH = path.resolve(__dirname, 'wake_word', modelFile);
    porcupineHandle = new Porcupine(process.env.PORCUPINE_API_KEY, keywordPaths, new Array(keywordPaths.length).fill(0.5), MY_MODEL_PATH);
    console.log("Wake word loaded");
}

function pressAnyKeyToContinue() {
    return new Promise((resolve) => {
        console.log("Please turn on microphone. Press any key to start 5 seconds of silence for calibration...");

        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.once('keypress', (str, key) => {
            process.stdin.setRawMode(false);
            resolve();
        });
    });
}

async function calibrate() {
    console.log("Calibrating...");

    let framesArray = [];
    let calibrationDuration = 5000; // calibrate for 5 seconds
    let startTime = Date.now();

    while (Date.now() - startTime < calibrationDuration) {
        const frames = await recorder.read();
        framesArray.push(...frames);
    }

    let sum = framesArray.reduce((a, b) => a + Math.abs(b), 0);
    let average = sum / framesArray.length;

    // Set SILENCE_THRESHOLD to be some percentage (e.g. 150%) above average
    SILENCE_THRESHOLD = average * 1.5;

    console.log(`Calibration completed. SILENCE_THRESHOLD set to ${SILENCE_THRESHOLD}`);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ SILENCE_THRESHOLD }));
}

function saveRecording() {
    // Create wave file using the 'wavefile' module
    let waveFile = new WaveFile();

    // Delete the recording file if it already exists
    if (fs.existsSync("recording.wav")) {
        fs.unlinkSync("recording.wav");
    }

    // Convert the recordingFrames to Int16Array
    const audioData = new Int16Array(recordingFrames.length * porcupineHandle.frameLength);
    for (let i = 0; i < recordingFrames.length; i++) {
        audioData.set(recordingFrames[i], i * porcupineHandle.frameLength);
    }

    waveFile.fromScratch(1, recorder.sampleRate, '16', audioData);
    fs.writeFileSync("recording.wav", waveFile.toBuffer());

    console.log('Recording saved to recording.wav file');
}

async function transcriptRecording() {
    console.log("Transcripting recording");
    const result = await speechToText("recording.wav");
    console.log("Detected sentence: " + result);
    console.log("Transcripting recording done");
    return result;
}



async function startListening() {
    console.log("Start listening");

    let silenceFramesCount = 0;

    while (1) {
        const frames = await recorder.read();

        if (isRecording) {
            recordingFrames.push(frames);

            // Check for silence
            let isSilence = frames.filter(frame => Math.abs(frame) < SILENCE_THRESHOLD).length / frames.length >= 0.9;
            if (isSilence) {
                silenceFramesCount++;
                if (silenceFramesCount > MAX_SILENCE_FRAMES) {
                    isRecording = false;
                    silenceFramesCount = 0;
                    saveRecording();
                    const result = await transcriptRecording();

                    console.log("Play random wait mp3");
                    readRandomWaitMP3();
                    answerToMessage(channelName, result);

                }
            } else {
                silenceFramesCount = 0;
            }
        } else {
            const index = porcupineHandle.process(frames);
            if (index !== -1) {
                console.log(`Wake word detected, start recording !`);
                readRandomWakeWordAnswerMP3();
                recordingFrames = [];
                isRecording = true;
            }
        }
    }
}

// // Set up bot commands
// const botCommands = [
//     createBotCommand('ask', async (params, { userName, reply }) => {
//         const question = params.join(' ');
//         await voiceHandler.streamMP3FromGoogleTTS(`Message de ${userName}: ${question}`, 'fr-FR');
//         answerToMessage(userName, question).then((answer) => {
//             reply(answer);
//         });
//     }),
// ];

// Set up Twitch bot
const bot = new Bot({
    authProvider,
    channels: [channelName],
    // commands: botCommands
});

console.log("Bot started and listening to channel " + channelName);


// Set up Twitch bot events
if (process.env.ENABLE_TWITCH_ONSUB === '1') {
    bot.onSub(({ broadcasterName, userName }) => {
        answerToMessage(userName, "Vient de s'abonner à la chaine !", 'onSub');
    });
}

if (process.env.ENABLE_TWITCH_ONRESUB === '1') {
    bot.onResub(({ broadcasterName, userName, months }) => {
        answerToMessage(userName, "Vient de se réabonner à la chaine pour un total de " + months + " mois !", 'onResub');
    });
}

// The same checks are applied to the other event handlers.
if (process.env.ENABLE_TWITCH_ONSUBGIFT === '1') {
    bot.onSubGift(({ broadcasterName, gifterName, userName }) => {
        const previousGiftCount = giftCounts.get(gifterName) ?? 0;
        if (previousGiftCount > 0) {
            giftCounts.set(gifterName, previousGiftCount - 1);
        } else {
            answerToMessage(userName, "Vient de recevoir un abonnement cadeau de la part de " + gifterName + " !", 'onSubGift');
        }
    });
}

if (process.env.ENABLE_TWITCH_ONCOMMUNITYSUB === '1') {
    bot.onCommunitySub(({ broadcasterName, gifterName, count }) => {
        const previousGiftCount = giftCounts.get(gifterName) ?? 0;
        giftCounts.set(gifterName, previousGiftCount + count);
        answerToMessage(gifterName, "Vient d'offrir " + count + " abonnements à la communauté !", 'onCommunitySub');
    });
}

if (process.env.ENABLE_TWITCH_ONPRIMEPAIDUPGRADE === '1') {
    bot.onPrimePaidUpgrade(({ broadcasterName, userName }) => {
        answerToMessage(userName, "Vient de passer d'un abonnement Amazon Prime à un abonnement Tier 1 !", 'onPrimePaidUpgrade');
    });
}

if (process.env.ENABLE_TWITCH_ONGIFTPAIDUPGRADE === '1') {
    bot.onGiftPaidUpgrade(({ broadcasterName, userName, gifterDisplayName }) => {
        answerToMessage(userName, "Vient de passer d'un abonnement cadeau offert par " + gifterDisplayName + " à un abonnement Tier 1 !", 'onGiftPaidUpgrade');
    });
}


async function readRandomWaitMP3() {
    const mp3Files = fs.readdirSync(path.join(__dirname, 'wait_mp3'));
    const randomMP3 = mp3Files[Math.floor(Math.random() * mp3Files.length)];
    console.log("Playing wait mp3: " + randomMP3);
    return await voiceHandler.streamMP3FromFile(path.join(__dirname, 'wait_mp3', randomMP3));
}

async function readRandomWakeWordAnswerMP3() {
    const mp3Files = fs.readdirSync(path.join(__dirname, 'wake_word_answer'));
    const randomMP3 = mp3Files[Math.floor(Math.random() * mp3Files.length)];
    console.log("Playing wake word answer: " + randomMP3);
    return await voiceHandler.streamMP3FromFile(path.join(__dirname, 'wake_word_answer', randomMP3));
}

function generatePromptFromGoal(goal) {
    let systemPrompt = fs.readFileSync(path.join(__dirname, 'prompts', 'base.txt'), 'utf8');
    let goalPrompt = fs.readFileSync(path.join(__dirname, 'prompts', goal + '.txt'), 'utf8');
    let customInstructions = fs.readFileSync(path.join(__dirname, 'prompts', 'custom_instructions.txt'), 'utf8');
    if (!goalPrompt) {
        throw new Error("Goal not found");
    }
    if (!customInstructions) {
        customInstructions = "";
    }
    const ttsInfos = voiceData.labels;

    systemPrompt = systemPrompt.replace(/{{botUsername}}/g, botUsername);
    systemPrompt = systemPrompt.replace(/{{channelName}}/g, channelName);
    systemPrompt = systemPrompt.replace(/{{streamInfos}}/g, JSON.stringify(streamInfos, null, 2));
    systemPrompt = systemPrompt.replace(/{{ttsInfos}}/g, JSON.stringify(ttsInfos, null, 2));
    systemPrompt = systemPrompt.replace(/{{goalPrompt}}/g, goalPrompt);
    systemPrompt = systemPrompt.replace(/{{customInstructions}}/g, customInstructions);

    const currentDateTime = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    return "Current datetime: " + currentDateTime + "\n" + systemPrompt;
}


function calculateGPTTokens(messages, model) {
    let data = new GPTTokens({
        model: model,
        messages: messages,
    });
    return data.usedTokens;
}
function getCleanedMessagesForModel(messages, model) {
    let maxTokensForModel = process.env.OPENAI_MAX_TOKENS_TOTAL;

    if (maxTokensForModel == 0) {
        maxTokensForModel = MAX_TOKENS[model];
    }

    maxTokensForModel = maxTokensForModel - process.env.OPENAI_MAX_TOKENS_ANSWER; // Leave the tokens for the response
    let totalTokens = calculateGPTTokens([messages[0]], model); // Start with tokens of system message
    let cleanedMessages = [messages[0]]; // Start with system message

    let tokensRemoved = 0;
    let messagesRemoved = 0;

    // Start from the second element on
    for (let i = 1; i < messages.length; i++) { 
        const message = messages[i];
        const messageTokens = calculateGPTTokens([message], model);

        if (totalTokens + messageTokens > maxTokensForModel) {
            tokensRemoved += messageTokens;
            messagesRemoved += 1;
            continue;
        }

        // Add the message to the end of the cleaned messages
        cleanedMessages.push(message); // instead of unshift()

        // Add the tokens to the total
        totalTokens += messageTokens;
    }

    return cleanedMessages;
}

// Functions
async function answerToMessage(messageUserName, message, goal = 'answerToMessage') {
    let systemPrompt = generatePromptFromGoal(goal);


    if (messageUserName == channelName) {
        messageUserName += " (the streamer)";
    }

    history.push({
        "role": "user",
        "content": JSON.stringify({ "user": "@" + messageUserName, "message": message })
    });
    // console.log(systemPrompt);
    const gptMessages = [{ "role": "system", "content": systemPrompt }, ...history];
    console.log("Sending message to OpenAI API");

    let retries = 0;
    let retriesMax = 3;
    let result = null;

    while (result == null && retries < retriesMax) {
        try {
            result = await openai.createChatCompletion({
                model: AIModel,
                messages: getCleanedMessagesForModel(gptMessages, AIModel),
                temperature: parseFloat(process.env.OPENAI_MODEL_TEMP),
                max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS_ANSWER),
            });
        } catch (error) {
            console.log("Error while sending message to OpenAI API");
            console.log("Retrying...");
            retries++;
        }
    }
    if (result == null) {
        throw new Error("Error while sending message to OpenAI API");
    }

    console.log("Message received from OpenAI API");

    const textAnswer = result.data.choices[0]['message']['content'];
    history.push({
        "role": "assistant",
        "content": textAnswer
    });

    console.log("Generating TTS of the message with ElevenLabs API");
    voiceHandler.generateElevenLabsTTS(textAnswer);
    return textAnswer;
}



async function speechToText(filePath) {
    const response = await openai.createTranscription(fs.createReadStream(filePath), "whisper-1");
    return response.data.text;
}

async function main() {
    const voices = await voiceHandler.getElevenLabsVoices();
    const voice = Object.values(voices.voices).find(voice => voice.voice_id == process.env.ELEVENLABS_VOICEID);
    if (voice) {
        voiceData = voice;
    } else {
        throw new Error("Voice not found");
    }

    const user = await apiClient.users.getUserByName(channelName);
    const userFollowers = await user.getChannelFollowers();

    streamInfos.followers = userFollowers.total;
    streamInfos.description = user.description;

    if (process.env.ENABLE_TWITCH_ONREDEMPTION === '1') {
        pubSubClient.onRedemption(user.id, async (message) => {
            console.log(`${message.userDisplayName} just redeemed ${message.rewardTitle}!`);
            if (redemptionTrigger == message.rewardTitle) {
                console.log(`Message: ${message.message}`);
                console.log("Generating TTS of the message");
                await voiceHandler.streamMP3FromGoogleTTS(`Message de ${message.userDisplayName}: ${message.message}`);
                console.log("Play random wait mp3");
                readRandomWaitMP3();
                const answerMessage = await answerToMessage(message.userDisplayName, message.message);
                bot.say(channelName, answerMessage);
            }
        });
    }
    if (process.env.ENABLE_TWITCH_ONBITS === '1') {
        pubSubClient.onBits(user.id, async (message) => {
            console.log(`${message.userName} just cheered ${message.bits} bits!`);
            const answerMessage = await answerToMessage(message.userName, "Vient de cheer " + message.bits + " bits !", 'onBits');
            bot.say(channelName, answerMessage);
        });
    }



    // Get current game and title
    const stream = await apiClient.streams.getStreamByUserId(user.id);
    if (stream) {
        streamInfos.gameName = stream.gameName;
        streamInfos.title = stream.title;
        streamInfos.viewers = stream.viewers;
    }


    // Create an interval to update the stream infos
    setInterval(async () => {
        const user = await apiClient.users.getUserByName(channelName);
        const userFollowers = await user.getChannelFollowers();
        streamInfos.followers = userFollowers.total;
        streamInfos.description = user.description;
        const stream = await apiClient.streams.getStreamByUserId(user.id);
        if (stream) {
            streamInfos.gameName = stream.gameName;
            streamInfos.title = stream.title;
            streamInfos.viewers = stream.viewers;
        }
    }, 10000);

}

function initMicrophone() {
    let force = false;
    if (process.argv.includes('--calibrate')) {
        force = true;
    }
    if (showChooseMic) {
        console.log(`Using device: ${recorder.getSelectedDevice()} | Wrong device? Run \`npm run choose-mic\` to select the correct input.`)
    } else {
        console.log(`Using device: ${recorder.getSelectedDevice()}`);
    }
    recorder.start();
    if (fs.existsSync(CONFIG_FILE) && !force) {
        // If config file exist, read value and start listening
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        SILENCE_THRESHOLD = config.SILENCE_THRESHOLD;
        console.log(`Configuration loaded. SILENCE_THRESHOLD is ${SILENCE_THRESHOLD} | Run \`npm run calibrate\` to recalibrate.`);

        startListening();
    } else {
        // If config file doesn't exist, start with pressing any key
        pressAnyKeyToContinue().then(calibrate).then(startListening);
    }
}

loadWakeWord();

if (process.argv.includes('--choose-mic')) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const devices = PvRecorder.getAvailableDevices();
    console.log('Available audio devices:');
    for (let i = 0; i < devices.length; i++) {
        console.log(`Device index: ${i} | Device name: ${devices[i]}`);
    }

    rl.question('Please enter the device index: ', (deviceId) => {
        rl.close();
        showChooseMic = false;
        recorder = new PvRecorder(porcupineHandle.frameLength, parseInt(deviceId));
        main();
        initMicrophone();
    });
} else {
    recorder = new PvRecorder(porcupineHandle.frameLength, -1);
    main();
    initMicrophone();
}

