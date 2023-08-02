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

let VAD, vad;
const USE_NODE_VAD = process.env.USE_NODE_VAD === '1';

if (USE_NODE_VAD) {
    VAD = require('node-vad');
    vad = new VAD(VAD.Mode.NORMAL);
}
dotenv.config();

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

let porcupineHandle;
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



const MAX_TOKENS = {
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16384,
    'gpt-4': 8192,
    'gpt-4-32k': 32768
};

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    basePath: process.env.OPENAI_BASEPATH,
}))


const authProvider = new StaticAuthProvider(clientId, accessToken);
const apiClient = new ApiClient({ authProvider });

const broadcasterAuthProvider = new StaticAuthProvider(broadcasterClientId, broadcasterAccessToken);
const broadcasterApiClient = new ApiClient({ authProvider: broadcasterAuthProvider });
const pubSubClient = new PubSubClient({ authProvider: broadcasterAuthProvider });


let history = [];
let streamInfos = {
    "gameName": "Just Chatting",
    "title": "Stream not started",
    "viewers": 0,
    "followers": 0,
    "description": "",
};

let voiceData = null;

let MICROPHONE_DEVICE = -1;
const CONFIG_FILE = './config.json';
let SILENCE_THRESHOLD;
const MAX_SILENCE_FRAMES = 96;

let recorder;
let recordingFrames = [];
let isRecording = false;

let showChooseMic = true;




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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ 
        MICROPHONE_DEVICE,
        SILENCE_THRESHOLD
     }));
}


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

function saveRecording() {
    let waveFile = new WaveFile();
    if (fs.existsSync("recording.wav")) {
        fs.unlinkSync("recording.wav");
    }

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
            const framesBuffer = Buffer.from(frames);
            recordingFrames.push(frames);

            if (USE_NODE_VAD) {
                // Use node-vad
                const res = await vad.processAudio(framesBuffer, recorder.sampleRate);
                switch (res) {
                    case VAD.Event.ERROR:
                        console.log("VAD error");
                        break;
                    case VAD.Event.NOISE:
                        // Not silence
                        silenceFramesCount = 0;
                        break;
                    case VAD.Event.SILENCE:
                        // Silence detected
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
                        break;
                    case VAD.Event.VOICE:
                        // Voice detected
                        silenceFramesCount = 0;
                        break;
                }
            } else {
                // Use SILENCE_THRESHOLD
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

const bot = new Bot({
    authProvider,
    channels: [channelName],
    // commands: botCommands
});

console.log("Bot started and listening to channel " + channelName);


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

const readFileSafely = (filePath, defaultValue = "") => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch {
        return defaultValue;
    }
};

function generatePromptFromGoal(goal) {
    const ttsInfos = voiceData.labels;
    const pathToPrompts = path.join(__dirname, 'prompts');
    const systemPrompt = readFileSafely(path.join(pathToPrompts, 'base.txt'));
    const goalPrompt = readFileSafely(path.join(pathToPrompts, `${goal}.txt`), "Goal not found");
    const customInstructions = readFileSafely(path.join(pathToPrompts, 'custom_instructions.txt'));

    const replaceObj = {
        '{{botUsername}}': botUsername,
        '{{channelName}}': channelName,
        '{{streamInfos}}': JSON.stringify(streamInfos, null, 2),
        '{{ttsInfos}}': JSON.stringify(ttsInfos, null, 2),
        '{{goalPrompt}}': goalPrompt,
        '{{customInstructions}}': customInstructions,
        '{{mainLanguage}}': process.env.AI_MAIN_LANGUAGE,
    }
    
    const formattedSystemPrompt = Object.keys(replaceObj).reduce((str, key) => str.replace(new RegExp(key, 'g'), replaceObj[key]), systemPrompt);
    
    const currentDateTime = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    return `Current datetime: ${currentDateTime}\n${formattedSystemPrompt}`;
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

    maxTokensForModel = maxTokensForModel - process.env.OPENAI_MAX_TOKENS_ANSWER;
    let totalTokens = calculateGPTTokens([messages[0]], model); 
    let cleanedMessages = [messages[0]]; 

    let tokensRemoved = 0;
    let messagesRemoved = 0;

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

    // console.log(systemPrompt);
    if (messageUserName == channelName) {
        messageUserName += " (the streamer)";
    }

    history.push({
        "role": "user",
        "content": JSON.stringify({ "user": messageUserName, "message": message })
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
    try {
        await voiceHandler.generateElevenLabsTTS(textAnswer);
    } catch (error) {
        console.log("Error while generating TTS with ElevenLabs API");
    }
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
            const answerMessage = await answerToMessage(message.userName, "Vient de cheer " + message.bits + " bits (Total envoyé depuis le début de la chaine par le viewer: `"+message.totalBits+"`) avec le message `"+message.message+"`", 'onBits');
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

function saveMicrophoneInput(deviceId) {
    MICROPHONE_DEVICE = deviceId;
    const config = {
        MICROPHONE_DEVICE,
        SILENCE_THRESHOLD
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config));
    console.log(`Microphone input saved: ${deviceId}`);
}

function readConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        if (config.MICROPHONE_DEVICE) {
            MICROPHONE_DEVICE = config.MICROPHONE_DEVICE;
        }
        if (config.SILENCE_THRESHOLD) {
            SILENCE_THRESHOLD = config.SILENCE_THRESHOLD;
        }
    }
}


function initMicrophone() {
    if (showChooseMic) {
        console.log(`Using microphone device: ${recorder.getSelectedDevice()} | Wrong device? Run \`npm run choose-mic\` to select the correct input.`)
    } else {
        console.log(`Using microphone device: ${recorder.getSelectedDevice()}`);
    }

    console.log(`Using speaker device: ${process.env.SPEAKER_DEVICE} | Wrong device? Run \`npm run choose-speaker\` to select the correct output.`);

    recorder.start();
    if (USE_NODE_VAD) {
        startListening();
    } else {
        let force = false;
        if (process.argv.includes('--calibrate')) {
            force = true;
        }
        if (!force && SILENCE_THRESHOLD) {
            console.log(`Configuration loaded. SILENCE_THRESHOLD is ${SILENCE_THRESHOLD} | Run \`npm run calibrate\` to recalibrate.`);
            startListening();
        } else {
            pressAnyKeyToContinue().then(calibrate).then(startListening);
        }
    }
}


async function chooseMicrophone() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const devices = PvRecorder.getAvailableDevices();
    console.log('Available microphone devices:');
    for (let i = 0; i < devices.length; i++) {
        console.log(`Device index: ${i} | Device name: ${devices[i]}`);
    }

    rl.question('Please enter the device index: ', (deviceId) => {
        rl.close();
        showChooseMic = false;
        saveMicrophoneInput(parseInt(deviceId));
        
        recorder = new PvRecorder(porcupineHandle.frameLength, MICROPHONE_DEVICE);
        main();
        initMicrophone();
    });
}

async function chooseSpeaker() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    let devicesList;
    voiceHandler.listSoundDevices().then((devices) => {
        devicesList = devices;
        console.log('Available speaker devices:');
        for (let i = 0; i < devices.length; i++) {
            console.log(`Device index: ${i} | Device name: ${devices[i].name}`);
        }
        rl.question('Please enter the device index: ', (deviceId) => {
            console.log(`Using speaker device: ${devicesList[parseInt(deviceId)].name}`);
            rl.close();
    
            recorder = new PvRecorder(porcupineHandle.frameLength, MICROPHONE_DEVICE);
            main();
            initMicrophone();
        });
    });
}

async function initialize() {
    readConfig();
    loadWakeWord();

    if (process.argv.includes('--choose-mic')) {
        await chooseMicrophone();
    } else if (process.argv.includes('--choose-speaker')) {
        await chooseSpeaker();
    } else {
        recorder = new PvRecorder(porcupineHandle.frameLength, MICROPHONE_DEVICE);
        await main();
        initMicrophone();
    }
}

initialize().catch(error => console.error(`Failed to initialize: ${error}`));


