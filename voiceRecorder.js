const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Porcupine } = require("@picovoice/porcupine-node");
const { PvRecorder } = require("@picovoice/pvrecorder-node");
const { WaveFile } = require("wavefile");
const voiceHandler = require("./modules/voiceHandler.js");
const readline = require("readline");
const openaiLib = require("./modules/openaiLib.js");
const axios = require("axios");

dotenv.config();

const enableDebug = process.env.DEBUG_MODE === "1";
const portNumber = process.env.PORT_NUMBER;

VAD = require("node-vad");
vad = new VAD(VAD.Mode.NORMAL);

// Error Handling
if (enableDebug) {
  process.on("uncaughtException", handleUncaughtException);
  process.on("unhandledRejection", handleUnhandledRejection);
}

let MICROPHONE_DEVICE = -1;
const CONFIG_FILE = "./config.json";
const MAX_SILENCE_FRAMES = 96;

let recorder;
let recordingFrames = [];
let isRecording = false;
let showChooseMic = true;
let porcupineHandle;
let isListening = true;

function handleUncaughtException(err, origin) {
  console.error("An uncaught exception occurred!");
  console.error(err);
  console.error("Exception origin:", origin);
}

function handleUnhandledRejection(reason, promise) {
  console.error("An unhandled rejection occurred!");
  console.error("Reason:", reason);
  console.error("Promise:", promise);
}

async function pressAnyKeyToContinue() {
  return new Promise((resolve) => {
    console.log(
      "Please turn on microphone. Press any key to start 5 seconds of silence for calibration..."
    );
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.once("keypress", (str, key) => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
}

function readRandomMP3(directory) {
  const mp3Files = fs.readdirSync(directory);
  const randomMP3 = mp3Files[Math.floor(Math.random() * mp3Files.length)];
  console.log(`Playing from ${directory}: ${randomMP3}`);
  return voiceHandler.streamMP3FromFile(path.join(directory, randomMP3));
}

function readRandomWakeWordAnswerMP3() {
  return readRandomMP3(path.join(__dirname, "wake_word_answer"));
}

function loadWakeWord() {
  try {
    const directoryPath = path.resolve(__dirname, "wake_word");
    let files = fs.readdirSync(directoryPath);
    let modelFile = files.find(
      (file) => file.startsWith("porcupine_params_") && file.endsWith(".pv")
    );
    let keywordFiles = files.filter((file) => file.endsWith(".ppn"));

    if (!modelFile) throw new Error("No model file found");
    if (!keywordFiles.length) throw new Error("No .ppn files found");

    let keywordPaths = keywordFiles.map((file) =>
      path.resolve(directoryPath, file)
    );
    const MY_MODEL_PATH = path.resolve(directoryPath, modelFile);
    porcupineHandle = new Porcupine(
      process.env.PORCUPINE_API_KEY,
      keywordPaths,
      new Array(keywordPaths.length).fill(0.5),
      MY_MODEL_PATH
    );

    console.log("Wake word loaded");
  } catch (error) {
    console.error(`Error loading wake word: ${error}`);
  }
}

function saveRecording() {
  try {
    let waveFile = new WaveFile();
    if (fs.existsSync("recording.wav")) {
      fs.unlinkSync("recording.wav");
    }
    const audioData = new Int16Array(
      recordingFrames.length * porcupineHandle.frameLength
    );
    for (let i = 0; i < recordingFrames.length; i++) {
      audioData.set(recordingFrames[i], i * porcupineHandle.frameLength);
    }
    waveFile.fromScratch(1, recorder.sampleRate, "16", audioData);
    fs.writeFileSync("recording.wav", waveFile.toBuffer());
    console.log("Recording saved to recording.wav file");
  } catch (error) {
    console.error(`Error saving recording: ${error}`);
  }
}

async function transcriptRecording() {
  try {
    console.log("Transcripting recording");
    const result = await openaiLib.speechToText("recording.wav");
    console.log("Detected sentence: " + result);
    console.log("Transcripting recording done");
    return result;
  } catch (error) {
    console.error(`Error during transcription: ${error}`);
  }
}

async function startListening() {
  console.log("Start listening");
  let silenceFramesCount = 0;

  while (isListening) {
    const frames = await recorder.read();

    if (isRecording) {
      // processFrames(frames);
      recordingFrames.push(frames);

      const isSilence = await handleSilenceDetection(frames);
      if (isSilence) {
        silenceFramesCount++;
        if (silenceFramesCount > MAX_SILENCE_FRAMES) {
          isRecording = false;
          silenceFramesCount = 0;
          saveRecording();
          const result = await transcriptRecording();
          await axios.post(`http://localhost:${portNumber}/transcription`, {
            transcription: result,
          });
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
  console.log("Loop ended");
}

async function handleSilenceDetection(frames) {
  const framesBuffer = Buffer.from(frames);
  const res = await vad.processAudio(framesBuffer, recorder.sampleRate);
  console.log(`VAD result: ${res}`);
  switch (res) {
    case VAD.Event.VOICE:
      return false; // Voice detected, not silence
    case VAD.Event.SILENCE:
    case VAD.Event.NOISE:
    case VAD.Event.ERROR:
    default:
      return true; // All other cases treated as silence
  }
}

function processFrames(frames) {
  const framesBuffer = Buffer.from(frames);
  vad
    .processAudio(framesBuffer, recorder.sampleRate)
    .then((res) => {
      if (res === VAD.Event.VOICE) {
        recordingFrames.push(frames);
      }
    })
    .catch(console.error);
}

function saveMicrophoneInput(deviceId) {
  MICROPHONE_DEVICE = deviceId;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ MICROPHONE_DEVICE }));
  console.log(`Microphone input saved: ${deviceId}`);
}

function readConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    MICROPHONE_DEVICE = config.MICROPHONE_DEVICE || MICROPHONE_DEVICE;
  }
}

function initMicrophone() {
  console.log(
    `Using microphone device: ${recorder.getSelectedDevice()} | Wrong device? Run \`npm run choose-mic\` to select the correct input.`
  );
  recorder.start();
  startListening();
}

async function chooseMicrophone() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const devices = PvRecorder.getAvailableDevices();
  console.log("Available microphone devices:");
  for (let i = 0; i < devices.length; i++) {
    console.log(`Device index: ${i} | Device name: ${devices[i]}`);
  }

  rl.question("Please enter the device index: ", (deviceId) => {
    rl.close();
    showChooseMic = false;
    saveMicrophoneInput(parseInt(deviceId));
    console.log("Please restart the script to use the new microphone input");
    process.exit(0);
  });
}

async function initialize() {
  readConfig();
  loadWakeWord();
  openaiLib.initVoice();

  if (process.argv.includes("--choose-mic")) {
    await chooseMicrophone();
  } else {
    recorder = new PvRecorder(porcupineHandle.frameLength, MICROPHONE_DEVICE);
    initMicrophone();
  }
}

initialize().catch((error) => console.error(`Failed to initialize: ${error}`));
