// Import required modules
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const Speaker = require('speaker');
const stream = require('stream');
const googleTTS = require('google-tts-api');
const axios = require('axios');

const { spawn } = require('child_process');


// Configure ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);



async function generateElevenLabsTTS(text) {
    const voiceId = process.env.ELEVENLABS_VOICEID;
    const apiKey = process.env.ELEVENLABS_APIKEY;
    const voiceStability = process.env.ELEVENLABS_VOICE_STABILITY || 0.5;
    const voiceSimilarityBoost = process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST || 0.5;
    const model = process.env.ELEVENLABS_VOICE_MODEL || 'eleven_multilingual_v1';

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
    const headers = {
        'accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
    };
    const data = {
        text,
        model_id: model,
        voice_settings: {
            stability: voiceStability,
            similarity_boost: voiceSimilarityBoost
        }
    };

    try {
        const response = await axios.post(url, data, {
            responseType: 'stream',
            headers
        });

        if (response.status === 401) {
            console.error("Unauthorized: Not enough credits or invalid API key.");
            // You can throw an error or handle it as needed
            throw new Error("Unauthorized");
        }

        console.log("Got the audio stream, playing it");
        // Convert MP3 to PCM using FFmpeg and stream to Speaker
        return createAudioStreamAndSpeaker(response.data);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log("Unauthorized: Not enough credits or invalid API key.");
            // You can handle this specific case as needed, e.g., by notifying the user
            return;
        }

        console.log("Error while generating TTS with ElevenLabs API, retrying...");
        return generateElevenLabsTTS(text);
    }
}


// Function to get voices from ElevenLabs
async function getElevenLabsVoices() {
    let voices = null;
    try {
        let voicesUrl = `https://api.elevenlabs.io/v1/voices`;
        const apiKey = process.env.ELEVENLABS_APIKEY;
        const headers = {
            'accept': 'application/json',
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
        };
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
    const audioBase64 = await googleTTS.getAudioBase64(text, {
        lang: lang,
        slow: false,
        host: 'https://translate.google.com',
    });

    // Convert base64 string to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Create a stream from the buffer
    const audioStream = new stream.PassThrough();
    audioStream.end(audioBuffer);

    return createAudioStreamAndSpeaker(audioStream);
}

// Function to create audio stream and speaker (common function used in several places)
async function createAudioStreamAndSpeaker(audioStream) {

    // Create a speaker instance
    const speaker = new Speaker({
        channels: 2,
        bitDepth: 16,
        sampleRate: 48000,
        device: process.env.SPEAKER_DEVICE
    });

    // speaker.on('open', () => console.log('Speaker stream opened.'));
    // speaker.on('close', () => console.log('Speaker stream closed.'));
    // speaker.on('flush', () => console.log('Speaker stream flushed.'));
    speaker.on('error', (err) => console.log('Speaker stream error:', err));
    try {
        return new Promise((resolve, reject) => {
            // Convert MP3 to PCM using FFmpeg and stream to Speaker
            ffmpeg(audioStream)
                .format('s16le')
                .audioChannels(2)
                .audioFrequency(48000)
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .pipe(speaker)
                .on('finish', resolve);
        });
    } catch (error) {
        console.log("Error while playing sound, retrying...");
        return createAudioStreamAndSpeaker(audioStream);
    }
}


async function streamMP3FromFile(filePath) {


    // Create a speaker instance
    const speaker = new Speaker({
        channels: 2,
        bitDepth: 16,
        sampleRate: 48000,
        device: process.env.SPEAKER_DEVICE
    });

    // speaker.on('open', () => console.log('Speaker stream opened.'));
    // speaker.on('close', () => console.log('Speaker stream closed.'));
    // speaker.on('flush', () => console.log('Speaker stream flushed.'));
    speaker.on('error', (err) => console.log('Speaker stream error:', err));

    // Create a readable stream from the file

    const audioStream = fs.createReadStream(filePath);

    // Create a Promise to handle the streaming process
    return new Promise((resolve, reject) => {
        // Convert MP3 to PCM using FFmpeg and stream to Speaker
        ffmpeg(audioStream)
            .inputFormat('mp3')
            .outputFormat('s16le')
            .audioChannels(2)
            .audioFrequency(48000)
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .pipe(speaker, { end: true })
            .on('finish', resolve);
    });
}

function listSoundDevices() {
    return new Promise((resolve, reject) => {
        const wmic = spawn('wmic', ['path', 'Win32_SoundDevice', 'get', '/format:list']);

        let output = '';
        let error = '';

        wmic.stdout.on('data', (data) => {
            output += data;
        });

        wmic.stderr.on('data', (data) => {
            error += data;
        });

        wmic.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`wmic command exited with code ${code}: ${error}`));
            }

            const devices = output
                .trim()                            // Remove trailing newline
                .split(/\r?\n/)                    // Split devices by single newline character
                .map(deviceInfo => {
                    const keyValue = deviceInfo.split('=');
                    const nameIndex = keyValue.findIndex(key => key.trim() === 'Caption');
                    return nameIndex !== -1 ? keyValue[nameIndex + 1].trim() : null;
                })
                .filter(name => name)               // Remove null values
                .map((name, id) => ({ id, name })); // Add IDs

            resolve(devices);
        });
    });
}


// Export your functions
module.exports = {
    generateElevenLabsTTS,
    getElevenLabsVoices,
    streamMP3FromGoogleTTS,
    createAudioStreamAndSpeaker,
    streamMP3FromFile,
    listSoundDevices
};
