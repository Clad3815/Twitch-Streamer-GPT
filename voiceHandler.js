// Import required modules
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const Speaker = require('speaker');
const stream = require('stream');
const googleTTS = require('google-tts-api');
const voice = require("elevenlabs-node");

const { spawn } = require('child_process');


// Configure ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

// Function to generate ElevenLabs TTS
async function generateElevenLabsTTS(text) {
    // Get the audio stream
    let audioStream = null;
    let model = 'eleven_multilingual_v1';
    if (process.env.ELEVENLABS_VOICE_MODEL) {
        model = process.env.ELEVENLABS_VOICE_MODEL;
    }
    try {
        audioStream = await voice.textToSpeechStream(process.env.ELEVENLABS_APIKEY, process.env.ELEVENLABS_VOICEID, text, process.env.ELEVENLABS_VOICE_STABILITY, process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST, model);
        console.log("Got the audio stream, playing it");
        // Convert MP3 to PCM using FFmpeg and stream to Speaker
        return createAudioStreamAndSpeaker(audioStream);
    } catch (error) {
        console.log("Error while generating TTS with ElevenLabs API, retrying...");
        return generateElevenLabsTTS(text);
    }
}

// Function to get voices from ElevenLabs
async function getElevenLabsVoices() {
    let voices = null;
    try {
        voices = await voice.getVoices(process.env.ELEVENLABS_APIKEY);
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

    return new Promise((resolve, reject) => {
        // Convert MP3 to PCM using FFmpeg and stream to Speaker
        ffmpeg(audioStream)
            .outputFormat('s16le')
            .audioChannels(2)
            .audioFrequency(48000)
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .pipe(speaker)
            .on('finish', resolve)
            .on('error', reject);
    });
}


async function streamMP3FromFile(filePath) {
    // Create a readable stream from the file
    const audioStream = fs.createReadStream(filePath);

    // Create a speaker instance
    const speaker = new Speaker({
        channels: 2,
        bitDepth: 16,
        sampleRate: 48000,
        device: process.env.SPEAKER_DEVICE
    });

    return new Promise((resolve, reject) => {
        // Convert MP3 to PCM using FFmpeg and stream to Speaker
        ffmpeg(audioStream)
            .outputFormat('s16le')
            .audioChannels(2)
            .audioFrequency(48000)
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .pipe(speaker)
            .on('finish', resolve)
            .on('error', reject);
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
