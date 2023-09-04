const ffmpegStatic = require('ffmpeg-static');
const Speaker = require('speaker');
const stream = require('stream');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();
const enableDebug = process.env.DEBUG_MODE == "1";


class BufferingStream extends stream.Transform {
    constructor(options) {
        super(options);
        this.bufferedChunks = [];
        this.bufferSize = 0;
        this.bufferLimit = options.bufferLimit || 0;  // Default buffer limit is 0 if not provided
    }

    _transform(chunk, encoding, callback) {
        this.bufferedChunks.push(chunk);
        this.bufferSize += chunk.length;

        if (this.bufferSize >= this.bufferLimit) {
            this.pushBufferedChunks();
            this.bufferedChunks = [];
            this.bufferSize = 0;
        }

        callback();
    }

    _flush(callback) {
        this.pushBufferedChunks();
        callback();
    }

    pushBufferedChunks() {
        this.bufferedChunks.forEach((chunk) => {
            this.push(chunk);
        });
    }
}


function createSpeaker() {
    const speaker = new Speaker({
        channels: 2,
        bitDepth: 16,
        sampleRate: 48000,
        // device: process.env.SPEAKER_DEVICE
    });
    if (enableDebug) {
        // speaker.on('drain', () => console.log('Speaker stream drained.'));
        speaker.on('pipe', (src) => console.log('Something is piping into the speaker.'));
        speaker.on('unpipe', (src) => console.log('Something stopped piping into the speaker.'));
        speaker.on('finish', () => console.log('Speaker stream finished.'));
        speaker.on('open', () => console.log('Speaker stream opened.'));
        speaker.on('close', () => console.log('Speaker stream closed.'));
        speaker.on('error', (err) => console.log('Speaker stream error:', err));
    }

    return speaker;
}

function addDebugLog(text) {
    if (enableDebug) {
        console.log(text);
        // Put in debug.log file
        fs.appendFileSync('debug.log', text + '\n');
    }
}

function createFFmpeg(audioStream, speaker) {
    if (enableDebug) {
        addDebugLog('Creating FFmpeg process: ' + ffmpegStatic);
    }
    let ffmpeg = null;
    try {
        ffmpeg = spawn(ffmpegStatic, [
            '-i', 'pipe:0',
            '-f', 's16le',
            '-acodec', 'pcm_s16le',
            '-ac', '2',
            '-ar', '48000',
            '-loglevel', 'verbose',
            'pipe:1'
        ], {
            env: { ...process.env }
        });
    } catch (error) {
        addDebugLog('Error creating FFmpeg process: ' + error);
        throw error;
    }
    // Redirect stderr to debug.log
    ffmpeg.stderr.on('data', (data) => {
        addDebugLog(`stderr: ${data}`);
    });


    audioStream.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(speaker);

    return ffmpeg;
}

function handleFFmpegEvents(ffmpeg) {
    return new Promise((resolve, reject) => {
        ffmpeg.on('error', (error) => {
            console.error('FFmpeg error:', error);
            reject(error);
        });

        ffmpeg.on('close', (code, signal) => {
            addDebugLog(`FFmpeg closed with code ${code} and signal ${signal}`);

            if (code !== 0) {
                console.error(`FFmpeg exited with code ${code} and signal ${signal}`);
                reject(new Error(`FFmpeg exited with code ${code} and signal ${signal}`));
            } else {
                resolve();
            }
        });
    });
}


const audioStream = new stream.PassThrough();
const bufferingStream = new BufferingStream({ bufferLimit: 10000 }); // Adjust buffer limit as needed
audioStream.pipe(bufferingStream);
const speaker = createSpeaker();
const ffmpeg = createFFmpeg(bufferingStream, speaker);


handleFFmpegEvents(ffmpeg)
    .then(() => {
        if (enableDebug) console.log('FFmpeg processing completed successfully.');
    })
    .catch((error) => {
        console.error('FFmpeg processing failed:', error);
        process.exit(1);
    });


process.stdin.on('data', (audioBuffer) => {
    audioStream.write(audioBuffer);
});

process.stdin.on('end', () => {
    audioStream.end();
});

speaker.on('close', () => {
    process.exit(0);
});

ffmpeg.on('error', (error) => {
    console.error('FFmpeg error:', error);
    process.exit(1);
});