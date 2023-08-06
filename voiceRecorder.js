// Import required modules
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Porcupine } = require('@picovoice/porcupine-node');
const { PvRecorder } = require("@picovoice/pvrecorder-node");
const { WaveFile } = require('wavefile');
const voiceHandler = require("./modules/voiceHandler.js");
const readline = require('readline');
const openaiLib = require("./modules/openaiLib.js");
const axios = require('axios');

dotenv.config();

let VAD, vad;
const USE_NODE_VAD = process.env.USE_NODE_VAD === '1';
const enableDebug = process.env.DEBUG_MODE === '1';

if (USE_NODE_VAD) {
    VAD = require('node-vad');
    vad = new VAD(VAD.Mode.NORMAL);
}

if (enableDebug) {
    process.on('uncaughtException', (err, origin) => {
        console.error('An uncaught exception occurred!');
        console.error(err);
        console.error('Exception origin:', origin);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('An unhandled rejection occurred!');
        console.error('Reason:', reason);
        console.error('Promise:', promise);
    });
}



let MICROPHONE_DEVICE = -1;
const CONFIG_FILE = './config.json';
let SILENCE_THRESHOLD;
const MAX_SILENCE_FRAMES = 48;

let recorder;
let recordingFrames = [];
let isRecording = false;

let showChooseMic = true;
let porcupineHandle;
const channelName = process.env.TWITCH_CHANNEL_NAME;
const portNumber = process.env.PORT_NUMBER;



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

async function readRandomWakeWordAnswerMP3() {
    const mp3Files = fs.readdirSync(path.join(__dirname, 'wake_word_answer'));
    const randomMP3 = mp3Files[Math.floor(Math.random() * mp3Files.length)];
    console.log("Playing wake word answer: " + path.join(__dirname, 'wake_word_answer', randomMP3));
    return await voiceHandler.streamMP3FromFile(path.join(__dirname, 'wake_word_answer', randomMP3));
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
    const result = await openaiLib.speechToText("recording.wav");
    console.log("Detected sentence: " + result);
    console.log("Transcripting recording done");
    return result;
}


let isListening = true;

async function startListening() {
    console.log("Start listening");
    let silenceFramesCount = 0;

    while (isListening) {
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
                            await axios.post(`http://localhost:${portNumber}/transcription`, { transcription: result });
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
                        
                        await axios.post(`http://localhost:${portNumber}/transcription`, { transcription: result });
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
    console.log("Loop ended");
}





// Function to initialize the voice handling script

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
        initMicrophone();
    });
}


async function initialize() {
    readConfig();
    loadWakeWord();
    openaiLib.initVoice();

    if (process.argv.includes('--choose-mic')) {
        await chooseMicrophone();
    } else {
        recorder = new PvRecorder(porcupineHandle.frameLength, MICROPHONE_DEVICE);
        initMicrophone();
    }
}

initialize().catch(error => console.error(`Failed to initialize: ${error}`));


