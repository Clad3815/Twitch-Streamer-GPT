
const fs = require('fs');
const path = require('path');

const { OpenAIApi, Configuration } = require('openai');

const tiktoken = require('js-tiktoken');

const { jsonrepair } = require('jsonrepair');
const voiceHandler = require("./voiceHandler.js");

const { createBotFunctions } = require("./botFunctions.js");

const { MAX_TOKENS } = require('./constants');

const dotenv = require('dotenv');
dotenv.config();
const botUsername = process.env.TWITCH_BOT_USERNAME;
const channelName = process.env.TWITCH_CHANNEL_NAME;
const enableDebug = process.env.DEBUG_MODE == "1";


let botFunctions;
let voiceData = null;

let history = [];
let modelEncodingCache = {}


let correctWords = {};

try {
  const data = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'correct_words.json'), 'utf8');
  correctWords = JSON.parse(data);
} catch (err) {
    if (enableDebug) {
        console.error('Error reading the file:', err);
    }
}


const AIModel = process.env.OPENAI_MODEL;

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    basePath: process.env.OPENAI_BASEPATH,
}));
loadHistory();

let streamInfos = {
    "gameName": "",
    "title": "Stream not started",
    "viewers": 0,
    "followers": 0,
    "description": "",
};


async function initVoice() {
    const voices = await voiceHandler.getElevenLabsVoices();
    const voice = Object.values(voices.voices).find(voice => voice.voice_id == process.env.ELEVENLABS_VOICEID);
    if (voice) {
        voiceData = voice;
    } else {
        throw new Error("Voice not found");
    }
}

async function initBotFunctions(broadcasterApiClient, broadcasterId) {
    botFunctions = createBotFunctions(broadcasterApiClient, broadcasterId);
}

function saveHistory() {
    fs.writeFileSync(path.join(__dirname, '..', 'history.json'), JSON.stringify(history, null, 2));
}

function loadHistory() {
    try {
        history = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'history.json')));
    } catch (e) {
        console.log("No history file found");
    }
}

async function analyseMessage(text) {
    const response = await openai.createModeration({
        input: text,
    });
    if (response.data.results[0].flagged) {
        console.log("Message flagged as inappropriate");
        return false;
    }
    return true;
}

async function answerToMessage(userData, message, isFunctionCall = false) {
    let systemPrompt = generatePrompt();
    userData.message = message;
    if (!isFunctionCall) {
        console.log('#############################################');
        console.log("Sending message to OpenAI API");
        history.push({
            "role": "user",
            "content": JSON.stringify(userData)
        });
    }
    if (enableDebug) {
        console.log(systemPrompt);
    }
    const gptMessages = [{ "role": "system", "content": systemPrompt }, ...history];

    let retries = 0;
    let retriesMax = 3;
    let result = null;

    let functions = botFunctions.map((botFunction) => {
        return botFunction.gptFunction;
    }).filter((gptFunction) => {
        return userData.isBroadcaster || !gptFunction.onlyBroadcaster;
    });
    while (result == null && retries < retriesMax) {
        try {
            const { model: modelToUse, messages: messagesToUse } = getCleanedMessagesForModel(gptMessages, AIModel);
            if (enableDebug) {
                console.log("Model used: " + modelToUse);
                console.log(JSON.stringify(messagesToUse, null, 2));

            }
            result = await openai.createChatCompletion({
                model: modelToUse,
                messages: messagesToUse,
                temperature: parseFloat(process.env.OPENAI_MODEL_TEMP),
                max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS_ANSWER),
                function_call: functions ? "auto" : "none",
                functions: functions,
            });
        } catch (error) {
            console.log("Error while sending message to OpenAI API");
            console.log("Retrying...");
            if (enableDebug) {
                console.log(error);
            }
            retries++;
        }
    }
    if (result == null) {
        throw new Error("Error while sending message to OpenAI API");
    }
    let gptAnswer = result.data.choices[0].message;
    history.push(gptAnswer);
    const textAnswer = gptAnswer['content'];
    if (textAnswer) {
        console.log("Message received from OpenAI API:");
        console.log(textAnswer + "\n");
        console.log("Generating TTS of the message with ElevenLabs API");
        try {
            const audioStream = await voiceHandler.generateElevenLabsTTS(textAnswer);
            if (gptAnswer.function_call) {
                // Play the TTS
                if (audioStream)   voiceHandler.playBufferingStream(audioStream);
            } else { 
                // Play the TTS
                if (audioStream)   await voiceHandler.playBufferingStream(audioStream);
            }
        } catch (error) {
            if (enableDebug) console.log("Error while generating TTS with ElevenLabs API:", error);
        }
    }
    if (gptAnswer.function_call) {
        const functionCall = await handleFunctionCall(gptAnswer.function_call);
        history.push(functionCall);
        return await answerToMessage(userData, message, true);
    }
    saveHistory();
    console.log('#############################################');
    return textAnswer;
}



// Functions
async function handleFunctionCall(functionCall) {
    // Finding the corresponding function from botFunctions
    const botFunction = botFunctions.find(f => f.gptFunction.name === functionCall.name);
    // If the function is found, call it with the provided arguments
    if (botFunction) {
        let { name, arguments: args } = functionCall;
        let argsFixed;
        try {
            argsFixed = JSON.parse(args);
        } catch (e) {
            try {
                argsFixed = JSON.parse(jsonrepair(args));
            } catch (e) {
                argsFixed = args;
            }
        }


        try {
            const result = await botFunction.function_to_call(argsFixed);
            // Returning the successful result in the required format
            return {
                role: 'function',
                name: functionCall.name,
                content: result
            };
        } catch (error) {
            console.error(`Error executing ${functionCall.name}:`, error);
            // Returning the error result in the required format
            return {
                role: 'function',
                name: functionCall.name,
                content: 'Error executing function'
            };
        }
    } else {
        console.warn(`Function ${functionCall.name} not found.`);
        // Returning a not found result in the required format
        return {
            role: 'function',
            name: functionCall.name,
            content: 'Function not found'
        };
    }
}


const readFileSafely = (filePath, defaultValue = "") => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch {
        return defaultValue;
    }
};


function setStreamInfos(streamData) {
    streamInfos = streamData;
}


function generatePrompt() {
    let ttsInfosData = voiceData.labels;
    let ttsInfos = {};

    if (ttsInfosData) {
        ttsInfos = {
            accent: ttsInfosData.accent,
            age: ttsInfosData.age,
            gender: ttsInfosData.gender,
        };

        
    }
    const pathToPrompts = path.join(__dirname, '..', 'prompts');
    const systemPrompt = readFileSafely(path.join(pathToPrompts, 'base.txt'));
    const customInstructions = readFileSafely(path.join(pathToPrompts, 'custom_instructions.txt'));
    let customInstructionsText = "";
    if (customInstructions) {
        customInstructionsText = `\n\nCustom instructions from the streamer to craft your answers:\n${customInstructions}\n\n`;
    }

    let ttsInfosText = "";
    if (ttsInfos) {
        ttsInfosText = `\n\nTTS Infos:\n${JSON.stringify(ttsInfos, null, 2)}\nPay attention to the gender and other characteristics of the voice, and try to craft your responses accordingly. For example if the TTS gender is female you have to write/acting like a female\n`;
    }
    const charLimit = process.env.OPENAI_MAX_CARACTERS_INSTRUCTIONS || 100;
    const wordLimitNotice = `IMPORTANT: The TTS service is not free. Keep your answer within ${charLimit} characters at the most.`;
    const languageRestriction = process.env.AI_MAIN_LANGUAGE ? `You must use only the language "${process.env.AI_MAIN_LANGUAGE}" in your answer, no exception. Even if the past messages are in english or another language.` : "";

    let streamerGenderInfos = "";
    if (process.env.STREAMER_GENDER && process.env.STREAMER_GENDER.length > 0) {
        streamerGenderInfos = `\nThe streamer identifies as ${process.env.STREAMER_GENDER}. When referring to or addressing the streamer, please use ${process.env.STREAMER_GENDER} forms of nouns, pronouns, and adjectives.`;
    }
    const replaceObj = {
        '{{botUsername}}': botUsername,
        '{{channelName}}': channelName,
        '{{streamInfos}}': JSON.stringify(streamInfos, null, 2) + streamerGenderInfos,
        '{{ttsInfos}}': ttsInfosText,
        '{{customInstructions}}': customInstructionsText,
    }
    
    const formattedSystemPrompt = Object.keys(replaceObj).reduce((str, key) => str.replace(new RegExp(key, 'g'), replaceObj[key]), systemPrompt);
    
    const currentDateTime = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    return `Current datetime: ${currentDateTime}\n${formattedSystemPrompt}\n${wordLimitNotice}\n${languageRestriction}`;
}



function getEncodingForModelCached(model) {
    if (!modelEncodingCache[model]) {
        try {
            modelEncodingCache[model] = tiktoken.encodingForModel(model)
        } catch (e) {
            if (enableDebug) {
                console.info('Model not found. Using cl100k_base encoding.')
            }
            modelEncodingCache[model] = tiktoken.getEncoding('cl100k_base')
        }
    }

    return modelEncodingCache[model]
}

function calculateGPTTokens(messages, model) {
    let encoding = getEncodingForModelCached(model);
    let num_tokens = 0;
    let tokens_per_message = 3;
    let tokens_per_name = 1;

    for (let i = 0; i < messages.length; i++) {
        num_tokens += tokens_per_message;

        // Handle content, if not null
        if (messages[i].content !== null) {
            num_tokens += encoding.encode(messages[i].content).length;
        }

        // Handle function_call, if present
        if (messages[i].function_call) {
            num_tokens += encoding.encode(JSON.stringify(messages[i].function_call)).length;
        }

        // Add tokens for other keys
        for (let key in messages[i]) {
            if (key !== 'content' && key !== 'function_call') {
                num_tokens += encoding.encode(messages[i][key]).length;
                if (key === 'name') { num_tokens += tokens_per_name }
            }
        }
    }

    return num_tokens + 3;
}

function getCleanedMessagesForModel(messages, model) {
    let autoSwitch = process.env.AUTO_USE_SMALL_MODEL === '1';

    let maxTokensForModel = parseInt(process.env.OPENAI_MAX_TOKENS_TOTAL, 10) || MAX_TOKENS[model];
    maxTokensForModel -= parseInt(process.env.OPENAI_MAX_TOKENS_ANSWER, 10);
    // Keep a margin of 10% of the max tokens for the model
    maxTokensForModel = Math.floor(maxTokensForModel * 0.90);
    if (enableDebug) {
        console.log(`Max Tokens for Model: ${maxTokensForModel}`);
    }

    let totalTokens = calculateGPTTokens([messages[0]], model); // Add tokens for the system prompt

    // Now, get the cleaned messages for the selected model
    let cleanedMessages = [messages[0]]; // Start with the system prompt

    for (let i = messages.length - 1; i >= 1; i--) {  // Start from the end, but skip system prompt
        const message = messages[i];
        try {
            const messageTokens = calculateGPTTokens([message], model);

            if (totalTokens + messageTokens <= maxTokensForModel) {
                // Add the message to the beginning of the cleaned messages, after the system prompt
                cleanedMessages.splice(1, 0, message);

                // Add the tokens to the total
                totalTokens += messageTokens;
            } else {
                if (enableDebug) {
                    console.log(`Message Skipped, Token Limit Reached`);
                }
                break;
            }
        } catch (error) {
            if (enableDebug) {
                console.log(`Error processing message: ${error.message}`);
            }
        }
    }

    // If tokens fit within a smaller model and auto-switching is enabled, choose the smaller model
    if (autoSwitch) {
        if (model === 'gpt-3.5-turbo-16k' && totalTokens <= MAX_TOKENS['gpt-3.5-turbo']) {
            model = 'gpt-3.5-turbo';
        } else if (model === 'gpt-4-32k' && totalTokens <= MAX_TOKENS['gpt-4']) {
            model = 'gpt-4';
        }
    }
    if (enableDebug) {
        console.log(`Final Total Tokens: ${totalTokens}`);
    }
    return {
        messages: cleanedMessages,
        model: model
    };
}


async function speechToText(filePath) {
    const keysString = Object.keys(correctWords).join(', ');

    const response = await openai.createTranscription(fs.createReadStream(filePath), "whisper-1", keysString);
    return response.data.text;
}


module.exports = {
    openai,
    analyseMessage,
    answerToMessage,
    speechToText,
    initBotFunctions,
    setStreamInfos,
    initVoice
};