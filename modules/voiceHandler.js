// Import required modules
const fs = require('fs');
const stream = require('stream');
const googleTTS = require('google-tts-api');
const axios = require('axios');
const dotenv = require('dotenv');
const writtenNumber = require('written-number');
const { spawn } = require('child_process');


dotenv.config();

const apiKey = process.env.ELEVENLABS_APIKEY;

const enableDebug = process.env.DEBUG_MODE == "1";


function getAuthHeaders() {
    return {
        'accept': 'application/json',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
    };
}

async function generateElevenLabsTTS(text) {
    const voiceId = process.env.ELEVENLABS_VOICEID;
    const voiceStability = process.env.ELEVENLABS_VOICE_STABILITY || 0.5;
    const voiceSimilarityBoost = process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST || 0.5;
    const model = process.env.ELEVENLABS_VOICE_MODEL || 'eleven_multilingual_v1';

    let textForElevenLabs = text;
    const regex = /\d+/g;
    const found = text.match(regex);
    if (found) {
        found.forEach((number) => {
            textForElevenLabs = textForElevenLabs.replace(number, ' ' + writtenNumber(number, { lang: 'fr' }));
        });
    }
    if (enableDebug) {
        console.log('Text:', text);
        console.log('Text for ElevenLabs TTS:', textForElevenLabs);
    }


    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
    const headers = getAuthHeaders();
    const data = {
        text: textForElevenLabs,
        model_id: model,
        voice_settings: {
            stability: parseFloat(voiceStability),
            similarity_boost: parseFloat(voiceSimilarityBoost)
        }
    };

    try {
        const response = await axios.post(url, data, {
            responseType: 'stream',
            headers
        });

        response.data.on('error', (err) => console.log('Response data stream error:', err));

        if (response.status === 401) {
            console.error("Unauthorized: Not enough credits or invalid API key.");
            throw new Error("Unauthorized");
        }

        console.log("Got the audio stream");
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log("Unauthorized: Not enough credits or invalid API key.");
            return;
        }
        console.log("Error while generating TTS with ElevenLabs API");
        throw error;
    }
}

async function playBufferingStream(audioStream) {
    return new Promise((resolve, reject) => {
        const audioPlayer = spawn('node', ['audioPlayer.js']);
        audioStream.pipe(audioPlayer.stdin);

        let errorOutput = '';
        audioPlayer.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        audioPlayer.on('close', (code) => {
            if (code !== 0) {
                console.error(`Audio player exited with code ${code}`);
                console.error('Error details:', errorOutput);
                reject(new Error(`Audio player exited with code ${code}. Details: ${errorOutput}`));
            } else {
                resolve();
            }
        });
    });
}


// Function to get voices from ElevenLabs
async function getElevenLabsVoices() {
    let voices = null;
    try {
        let voicesUrl = `https://api.elevenlabs.io/v1/voices`;
        const headers = getAuthHeaders();
        const response = await axios.get(voicesUrl, {
            headers
        });
        voices = response.data;
    } catch (error) {
        console.log("Error while getting voices with ElevenLabs API, retrying...");
    }
    return voices;
}

// Function to play sound from Google TTS
async function streamMP3FromGoogleTTS(text, lang = 'fr') {
    // Get base64 encoded audio from Google TTS
    const audioBase64 = await googleTTS.getAudioBase64(text.substring(0, 199), {
        lang: lang,
        slow: false,
        host: 'https://translate.google.com',
    });

    // Convert base64 string to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Create a stream from the buffer
    const audioStream = new stream.PassThrough();
    audioStream.end(audioBuffer);

    return audioStream;
}

function streamMP3FromFile(filePath) {
    return new Promise((resolve, reject) => {
        // Create a read stream from the file
        const audioStream = fs.createReadStream(filePath);
        
        const audioPlayer = spawn('node', ['audioPlayer.js']);
        audioStream.pipe(audioPlayer.stdin);

        let errorOutput = '';
        audioPlayer.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        audioPlayer.on('close', (code) => {
            if (code !== 0) {
                console.error(`Audio player exited with code ${code}`);
                console.error('Error details:', errorOutput);
                reject(new Error(`Audio player exited with code ${code}. Details: ${errorOutput}`));
            } else {
                resolve();
            }
        });
    });
}

const actionQueue = [];
let isProcessingQueue = false;

async function processQueue() {
    if (actionQueue.length === 0 || isProcessingQueue) return;
    isProcessingQueue = true;
    while (actionQueue.length > 0) {
        const { action, resolve } = actionQueue.shift();
        await action(); // Execute the action
        resolve(); // Resolve the Promise for this specific action
    }
    isProcessingQueue = false;
}

async function addActionToQueue(action) {
    return new Promise((resolve) => {
        actionQueue.push({ action, resolve });
        processQueue(); // Trigger the queue processing
    });
}



// Export your functions
module.exports = {
    generateElevenLabsTTS,
    getElevenLabsVoices,
    streamMP3FromGoogleTTS,
    streamMP3FromFile,
    playBufferingStream,
    addActionToQueue
};
