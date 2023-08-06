// Import required modules
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Bot } = require('@twurple/easy-bot');
const { StaticAuthProvider } = require('@twurple/auth');
const { PubSubClient } = require('@twurple/pubsub');
const { ApiClient } = require('@twurple/api');
const voiceHandler = require("./modules/voiceHandler.js");
const openaiLib = require("./modules/openaiLib.js");
const express = require('express');

dotenv.config();
const enableDebug = process.env.DEBUG_MODE === '1';
// Create an Express app
const app = express();
app.use(express.json());


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


const clientId = process.env.TWITCH_BOT_CLIEND_ID;
const accessToken = process.env.TWITCH_BOT_ACCESS_TOKEN;
const refreshToken = process.env.TWITCH_BOT_REFRESH_TOKEN;
const channelName = process.env.TWITCH_CHANNEL_NAME;

const broadcasterClientId = process.env.TWITCH_BROADCASTER_CLIEND_ID;
const broadcasterAccessToken = process.env.TWITCH_BROADCASTER_ACCESS_TOKEN;

const redemptionTrigger = process.env.TWITCH_POINT_REDEMPTIONS_TRIGGER;

const giftCounts = new Map();

const authProvider = new StaticAuthProvider(clientId, accessToken);
const apiClient = new ApiClient({ authProvider });

const broadcasterAuthProvider = new StaticAuthProvider(broadcasterClientId, broadcasterAccessToken);
const broadcasterApiClient = new ApiClient({ authProvider: broadcasterAuthProvider });
const pubSubClient = new PubSubClient({ authProvider: broadcasterAuthProvider });


const bot = new Bot({
    authProvider,
    channels: [channelName],
});

console.log("Bot started and listening to channel " + channelName);


if (process.env.ENABLE_TWITCH_ONSUB === '1') {
    bot.onSub(({ broadcasterName, userName }) => {
        const message = openaiLib.answerToMessage(userName, "Vient de s'abonner à la chaine !", 'onSub');
        bot.say(channelName, message);
    });
}

if (process.env.ENABLE_TWITCH_ONRESUB === '1') {
    bot.onResub(({ broadcasterName, userName, months }) => {
        const message = openaiLib.answerToMessage(userName, "Vient de se réabonner à la chaine pour un total de " + months + " mois !", 'onResub');
        bot.say(channelName, message);
    });
}

if (process.env.ENABLE_TWITCH_ONSUBGIFT === '1') {
    bot.onSubGift(({ broadcasterName, gifterName, userName }) => {
        const previousGiftCount = giftCounts.get(gifterName) ?? 0;
        if (previousGiftCount > 0) {
            giftCounts.set(gifterName, previousGiftCount - 1);
        } else {
            const message = openaiLib.answerToMessage(userName, "Vient de recevoir un abonnement cadeau de la part de " + gifterName + " !", 'onSubGift');
            bot.say(channelName, message);
        }
    });
}

if (process.env.ENABLE_TWITCH_ONCOMMUNITYSUB === '1') {
    bot.onCommunitySub(({ broadcasterName, gifterName, subInfo }) => {
        const previousGiftCount = giftCounts.get(gifterName) ?? 0;
        giftCounts.set(gifterName, previousGiftCount + subInfo.count);
        const message = openaiLib.answerToMessage(gifterName, "Vient d'offrir " + subInfo.count + " abonnements à la communauté !", 'onCommunitySub');
        bot.say(channelName, message);
    });
}

if (process.env.ENABLE_TWITCH_ONPRIMEPAIDUPGRADE === '1') {
    bot.onPrimePaidUpgrade(({ broadcasterName, userName }) => {
        const message = openaiLib.answerToMessage(userName, "Vient de passer d'un abonnement Amazon Prime à un abonnement Tier 1 !", 'onPrimePaidUpgrade');
        bot.say(channelName, message);
    });
}

if (process.env.ENABLE_TWITCH_ONGIFTPAIDUPGRADE === '1') {
    bot.onGiftPaidUpgrade(({ broadcasterName, userName, gifterDisplayName }) => {
        const message = openaiLib.answerToMessage(userName, "Vient de passer d'un abonnement cadeau offert par " + gifterDisplayName + " à un abonnement Tier 1 !", 'onGiftPaidUpgrade');
        bot.say(channelName, message);
    });
}


function readRandomWaitMP3() {
    const mp3Files = fs.readdirSync(path.join(__dirname, 'wait_mp3'));
    const randomMP3 = mp3Files[Math.floor(Math.random() * mp3Files.length)];
    console.log("Playing wait mp3: " + path.join(__dirname, 'wait_mp3', randomMP3));
    voiceHandler.streamMP3FromFile(path.join(__dirname, 'wait_mp3', randomMP3));
}


async function main() {
    let streamInfos = {};

    const user = await apiClient.users.getUserByName(channelName);
    const userFollowers = await user.getChannelFollowers();

    openaiLib.initVoice();
    await openaiLib.initBotFunctions(broadcasterApiClient, user.id);

    streamInfos.followers = userFollowers.total;
    streamInfos.description = user.description;

    if (process.env.ENABLE_TWITCH_ONREDEMPTION === '1') {
        pubSubClient.onRedemption(user.id, async (message) => {
            console.log(`${message.userDisplayName} just redeemed ${message.rewardTitle}!`);
            if (redemptionTrigger == message.rewardTitle) {
                console.log(`Message: ${message.message}`);
                if (!await openaiLib.analyseMessage(message.message)) {
                    bot.say(channelName, "Désolé, mais nous n'acceptons pas ce genre de langage ici. Essayons de garder le chat respectueux et amusant pour tout le monde !");
                    return;
                }
                console.log("Generating TTS of the message");
                const audioStream = await voiceHandler.streamMP3FromGoogleTTS(`Message de ${message.userDisplayName}: ${message.message}`);
                await voiceHandler.playBufferingStream(audioStream);
                await new Promise(r => setTimeout(r, 1000));
                console.log("Play random wait mp3");
                readRandomWaitMP3();
                const answerMessage = await openaiLib.answerToMessage(message.userDisplayName, message.message);
                bot.say(channelName, answerMessage);
            }
        });
    }
    if (process.env.ENABLE_TWITCH_ONBITS === '1') {
        pubSubClient.onBits(user.id, async (message) => {
            console.log(`${message.userName} just cheered ${message.bits} bits!`);
            const answerMessage = await openaiLib.answerToMessage(message.userName, "Vient de cheer " + message.bits + " bits (Total envoyé depuis le début de la chaine par le viewer: `"+message.totalBits+"`) avec le message `"+message.message+"`", 'onBits');
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

    openaiLib.setStreamInfos(streamInfos);

    // Create an interval to update the stream infos
    setInterval(async () => {
        let streamInfos = {};
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
        openaiLib.setStreamInfos(streamInfos);
    }, 10000);
}

// Endpoint to receive transcriptions from the voice input script
app.post('/transcription', async (req, res) => {
    const transcription = req.body.transcription;

    readRandomWaitMP3();
    openaiLib.answerToMessage(channelName, transcription).then((answerMessage) => {
        bot.say(channelName, answerMessage);
    });

    res.sendStatus(200);
});

// Start the Express server
const port = process.env.PORT_NUMBER || 3000;
app.listen(port, () => {
    console.log(`Twitch bot listening at http://localhost:${port}`);
});


main();