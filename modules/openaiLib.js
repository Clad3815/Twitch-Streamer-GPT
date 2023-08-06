
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
    // Vérifier le message en utilisant l'API de modération d'OpenAI
    const response = await openai.createModeration({
        input: text,
    });
    if (response.data.results[0].flagged) {
        console.log("Message flagged as inappropriate");
        return false;
    }
    return true;
}



async function answerToMessage(messageUserName, message, goal = 'answerToMessage', isFunctionCall = false) {
    let systemPrompt = generatePromptFromGoal(goal);
    let canUseFunctions = false;
    if (messageUserName == channelName) {
        messageUserName += " (the streamer)";
        canUseFunctions = true;
    }
    if (!isFunctionCall) {
        console.log('#############################################');
        console.log("Sending message to OpenAI API");
        history.push({
            "role": "user",
            "content": JSON.stringify({ "user": messageUserName, "message": message })
        });
    }
    const gptMessages = [{ "role": "system", "content": systemPrompt }, ...history];

    let retries = 0;
    let retriesMax = 3;
    let result = null;

    let functions = botFunctions.map((botFunction) => {
        return botFunction.gptFunction;
    }).filter((gptFunction) => {
        return canUseFunctions || !gptFunction.onlyBroadcaster;
    });
    if (enableDebug) {
        console.log(JSON.stringify(gptMessages, null, 2));
    }
    while (result == null && retries < retriesMax) {
        try {
            result = await openai.createChatCompletion({
                model: AIModel,
                messages: getCleanedMessagesForModel(gptMessages, AIModel),
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
        const functionCall = await handleFunctionCall(gptAnswer.function_call, messageUserName);
        history.push(functionCall);
        return await answerToMessage(messageUserName, message, goal, true);
    }
    saveHistory();
    console.log('#############################################');
    return textAnswer;
}



// Functions
async function handleFunctionCall(functionCall, userName) {
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


function generatePromptFromGoal(goal) {
    const ttsInfos = voiceData.labels;
    const pathToPrompts = path.join(__dirname, '..', 'prompts');
    const systemPrompt = readFileSafely(path.join(pathToPrompts, 'base.txt'));
    const goalPrompt = readFileSafely(path.join(pathToPrompts, `${goal}.txt`), "Goal not found");
    const customInstructions = readFileSafely(path.join(pathToPrompts, 'custom_instructions.txt'));
    let customInstructionsText = "";
    if (customInstructions) {
        customInstructionsText = `\n\nCustom instructions from the streamer to craft your answers:\n${customInstructions}\n\n`;
    }

    let ttsInfosText = "";
    if (ttsInfos) {
        ttsInfosText = `\n\nTTS Infos:\n${JSON.stringify(ttsInfos, null, 2)}\nPay attention to the gender and other characteristics of the voice, and try to craft your responses accordingly.\n`;
        if (ttsInfos.gender == "female") {
            ttsInfosText += "\nUse feminine forms of nouns, pronouns, and adjectives in your responses to align with the female voice.\n";
        }
    }


    const replaceObj = {
        '{{botUsername}}': botUsername,
        '{{channelName}}': channelName,
        '{{streamInfos}}': JSON.stringify(streamInfos, null, 2),
        '{{ttsInfos}}': ttsInfosText,
        '{{goalPrompt}}': goalPrompt,
        '{{customInstructions}}': customInstructionsText,
        '{{mainLanguage}}': process.env.AI_MAIN_LANGUAGE,
    }
    
    const formattedSystemPrompt = Object.keys(replaceObj).reduce((str, key) => str.replace(new RegExp(key, 'g'), replaceObj[key]), systemPrompt);
    
    const currentDateTime = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    return `Current datetime: ${currentDateTime}\n${formattedSystemPrompt}`;
}



function getEncodingForModelCached(model) {
    if (!modelEncodingCache[model]) {
        try {
            modelEncodingCache[model] = tiktoken.encodingForModel(model)
        } catch (e) {
            console.info('Model not found. Using cl100k_base encoding.')
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
    let autoSwitch = process.env.AUTO_USE_SMALL_MODEL === '1'; // Assuming it's a string 'true' or 'false'
    
    let maxTokensForModel = parseInt(process.env.OPENAI_MAX_TOKENS_TOTAL, 10) || MAX_TOKENS[model];
    maxTokensForModel -= parseInt(process.env.OPENAI_MAX_TOKENS_ANSWER, 10);
    // Keep a margin of 5% of the max tokens for the model
    maxTokensForModel = Math.floor(maxTokensForModel * 0.95);
    
    console.log(`Max Tokens for Model: ${maxTokensForModel}`);
    
    let totalTokens = calculateGPTTokens(messages, model);

    // If tokens exceed and auto-switching is enabled, choose the next best model
    if (totalTokens > maxTokensForModel && autoSwitch) {
        switch (model) {
            case 'gpt-3.5-turbo-16k':
                model = 'gpt-3.5-turbo';
                break;
            case 'gpt-4-32k':
                model = 'gpt-4';
                break;
            default:
                // console.log('No smaller model available or model not recognized.');
                break;
        }
    }

    // Now, get the cleaned messages for the selected model
    let cleanedMessages = [];
    totalTokens = 0;
    for (let i = messages.length - 1; i >= 0; i--) { 
        const message = messages[i];
        try {
            const messageTokens = calculateGPTTokens([message], model);

            if (totalTokens + messageTokens <= maxTokensForModel) {
                // Add the message to the beginning of the cleaned messages
                cleanedMessages.unshift(message);
    
                // Add the tokens to the total
                totalTokens += messageTokens;
            } else {
                // console.log(`Message Skipped, Token Limit Reached`);
                break;
            }
        } catch (error) {
            console.log(`Error processing message: ${error.message}`);
        }
    }

    console.log(`Final Total Tokens: ${totalTokens}`);
    return {
        messages: cleanedMessages,
        model: model
    };
}

async function speechToText(filePath) {
    const response = await openai.createTranscription(fs.createReadStream(filePath), "whisper-1");
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