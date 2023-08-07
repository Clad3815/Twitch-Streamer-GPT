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

const tmi = require('@twurple/auth-tmi');

dotenv.config();
const enableDebug = process.env.DEBUG_MODE === '1';
// Create an Express app
const app = express();
app.use(express.json());
const promptsConfig = JSON.parse(fs.readFileSync('./prompts/prompts.json', 'utf-8'));


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

const tmiClient = new tmi.Client({
	options: { debug: enableDebug },
	connection: {
		reconnect: true,
		secure: true
	},
	authProvider: broadcasterAuthProvider,
	channels: [channelName]
});

console.log("Bot started and listening to channel " + channelName);

async function handleTwitchEvent(eventHandler, data) {
    // Add the action to the queue
    await voiceHandler.addActionToQueue(() => eventHandler(data));
}

// Twitch Event Subscriptions

if (process.env.ENABLE_TWITCH_ONSUB === '1') {
    bot.onSub((data) => handleTwitchEvent(handleOnSub, data));
}

if (process.env.ENABLE_TWITCH_ONRESUB === '1') {
    tmiClient.on("resub", (channel, username, streakMonths, message, userstate, methods) => {
        let cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
        handleTwitchEvent(handleOnResub, { broadcasterName: channel, userName: username, months: cumulativeMonths });
    });
}

if (process.env.ENABLE_TWITCH_ONSUBGIFT === '1') {
    tmiClient.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
        let senderCount = ~~userstate["msg-param-sender-count"];
        handleTwitchEvent(handleOnSubGift, { broadcasterName: channel, gifterName: username, recipient: recipient, totalGiftSubCount: senderCount });
    });
}

if (process.env.ENABLE_TWITCH_ONCOMMUNITYSUB === '1') {
    tmiClient.on("submysterygift", (channel, username, numbOfSubs, methods, userstate) => {
        let senderCount = ~~userstate["msg-param-sender-count"];
        handleTwitchEvent(handleOnCommunitySub, { broadcasterName: channel, gifterName: username, giftSubCount: numbOfSubs, totalGiftSubCount: senderCount });
    });
}


if (process.env.ENABLE_TWITCH_ONPRIMEPAIDUPGRADE === '1') {
    bot.onPrimePaidUpgrade((data) => handleTwitchEvent(handleOnPrimePaidUpgrade, data));
}

if (process.env.ENABLE_TWITCH_ONGIFTPAIDUPGRADE === '1') {
    bot.onGiftPaidUpgrade((data) => handleTwitchEvent(handleOnGiftPaidUpgrade, data));
}


// Add other event subscriptions as needed

function readRandomWaitMP3() {
    const mp3Files = fs.readdirSync(path.join(__dirname, 'wait_mp3'));
    const randomMP3 = mp3Files[Math.floor(Math.random() * mp3Files.length)];
    console.log("Playing wait mp3: " + path.join(__dirname, 'wait_mp3', randomMP3));
    voiceHandler.streamMP3FromFile(path.join(__dirname, 'wait_mp3', randomMP3));
}


// Event Handling Functions
async function handleOnSub({ broadcasterName, userName }) {
    const userData = {
        name: "system"
    };
    const prompt = promptsConfig.onSub.replace('{userName}', userName).replace('{broadcasterName}', broadcasterName);
    openaiLib.answerToMessage(userData, prompt).then((message) => {
        bot.say(channelName, message);
    });
}

async function handleOnResub({ broadcasterName, userName, months }) {
    const userData = {
        name: "system"
    };
    const prompt = promptsConfig.onResub.replace('{userName}', userName).replace('{broadcasterName}', broadcasterName).replace('{months}', months);
    openaiLib.answerToMessage(userData, prompt).then((message) => {
        bot.say(channelName, message);
    });
}

async function handleOnSubGift({ broadcasterName, gifterName, recipient, totalGiftSubCount }) {
    const userData = {
        name: "system"
    };
    const prompt = promptsConfig.onSubGift.replace('{userName}', recipient).replace('{gifterName}', gifterName).replace('{broadcasterName}', broadcasterName);
    openaiLib.answerToMessage(userData, prompt).then((message) => {
        bot.say(channelName, message);
    });
}

async function handleOnCommunitySub({ broadcasterName, gifterName, giftSubCount, totalGiftSubCount }) {
    const userData = {
        name: "system"
    };
    const prompt = promptsConfig.onCommunitySub.replace('{gifterName}', gifterName).replace('{broadcasterName}', broadcasterName).replace('{giftSubCount}', giftSubCount).replace('{totalGiftSubCount}', totalGiftSubCount);
    openaiLib.answerToMessage(userData, prompt).then((message) => {
        bot.say(channelName, message);
    });
}

async function handleOnPrimePaidUpgrade({ broadcasterName, userName }) {
    const userData = {
        name: "system"
    };
    const prompt = promptsConfig.onPrimePaidUpgrade.replace('{userName}', userName).replace('{broadcasterName}', broadcasterName);
    openaiLib.answerToMessage(userData, prompt).then((message) => {
        bot.say(channelName, message);
    });
}

async function handleOnGiftPaidUpgrade({ broadcasterName, userName, gifterDisplayName }) {
    const userData = {
        name: "system"
    };
    const prompt = promptsConfig.onGiftPaidUpgrade.replace('{userName}', userName).replace('{gifterDisplayName}', gifterDisplayName).replace('{broadcasterName}', broadcasterName);
    openaiLib.answerToMessage(userData, prompt).then((message) => {
        bot.say(channelName, message);
    });
}


async function main() {
    // Check OpenAI model availability
    try {
        await openaiLib.openai.retrieveModel(process.env.OPENAI_MODEL);
        console.log(`Using OpenAI model ${process.env.OPENAI_MODEL}.`);
    } catch (error) {
        if (process.env.OPENAI_BASEPATH.startsWith('https://api.openai.com')) {
            console.log(`The model ${process.env.OPENAI_MODEL} is not available.`);
            process.exit(1);
        } else {
            console.log(`Using OpenAI model ${process.env.OPENAI_MODEL}.`);
        }
    }

    let streamInfos = {};

    const user = await broadcasterApiClient.users.getUserByName(channelName);
    const userFollowers = await user.getChannelFollowers();

    openaiLib.initVoice();
    await openaiLib.initBotFunctions(broadcasterApiClient, user.id);

    streamInfos.followers = userFollowers.total;
    streamInfos.description = user.description;

    if (process.env.ENABLE_TWITCH_ONREDEMPTION === '1') {
        pubSubClient.onRedemption(user.id, async (message) => {
            const redemptionAction = async () => {
                console.log(`${message.userDisplayName} just redeemed ${message.rewardTitle}!`);
                if (redemptionTrigger == message.rewardTitle) {
                    console.log(`Message: ${message.message}`);
                    if (!await openaiLib.analyseMessage(message.message)) {
                        bot.say(channelName, promptsConfig.warningMessage);
                        return;
                    }
                    const enableGoogleTTS = process.env.READ_CHANNEL_POINT_REDEMPTIONS === '1';
                    if (enableGoogleTTS) {
                        console.log("Generating TTS of the message");
                        const ttsPrompt = promptsConfig.ttsMessage.replace('{userDisplayName}', message.userDisplayName).replace('{message}', message.message);
                        const audioStream = await voiceHandler.streamMP3FromGoogleTTS(ttsPrompt);
                        await voiceHandler.playBufferingStream(audioStream);
                        await new Promise(r => setTimeout(r, 1000));
                        console.log("Play random wait mp3");
                        readRandomWaitMP3();
                    }
                    const userData = await getViewerInfos(message.userDisplayName);
                    const answerMessage = await openaiLib.answerToMessage(userData, message.message);
                    bot.say(channelName, answerMessage);
                }
            };

            // Add the action to the queue
            await voiceHandler.addActionToQueue(redemptionAction);


        });
    }
    if (process.env.ENABLE_TWITCH_ONBITS === '1') {
        pubSubClient.onBits(user.id, async (message) => {
            const bitsAction = async () => {
                const minBits = process.env.TWITCH_MIN_BITS ? parseInt(process.env.TWITCH_MIN_BITS) : 0;
                if (message.bits >= minBits) {
                    const prompt = promptsConfig.onBits
                        .replace('{bits}', message.bits)
                        .replace('{totalBits}', message.totalBits)
                        .replace('{message}', message.message);

                    if (!await openaiLib.analyseMessage(prompt)) {
                        bot.say(channelName, promptsConfig.warningMessage);
                        return;
                    }
                    
                    const userData = await getViewerInfos(message.userName);
                    const answerMessage = await openaiLib.answerToMessage(userData, prompt);
                    bot.say(channelName, answerMessage);
                }
            };

            // Add the action to the queue
            await voiceHandler.addActionToQueue(bitsAction);
        });
    }


    // Get current game and title
    const stream = await broadcasterApiClient.streams.getStreamByUserId(user.id);
    if (stream) {
        streamInfos.gameName = stream.gameName;
        streamInfos.title = stream.title;
        streamInfos.viewers = stream.viewers;
    }

    openaiLib.setStreamInfos(streamInfos);

    // Create an interval to update the stream infos
    setInterval(async () => {
        let streamInfos = {};
        const user = await broadcasterApiClient.users.getUserByName(channelName);
        const userFollowers = await user.getChannelFollowers();
        streamInfos.followers = userFollowers.total;
        streamInfos.description = user.description;
        const stream = await broadcasterApiClient.streams.getStreamByUserId(user.id);
        if (stream) {
            streamInfos.gameName = stream.gameName;
            streamInfos.title = stream.title;
            streamInfos.viewers = stream.viewers;
        }
        openaiLib.setStreamInfos(streamInfos);
    }, 10000);

    
    await tmiClient.connect().catch(console.error);
}

// Endpoint to receive transcriptions from the voice input script
app.post('/transcription', async (req, res) => {
    const transcription = req.body.transcription;

    const onTranscriptionAction = async () => {
        readRandomWaitMP3();
        let userData = {
            name: channelName,
            isBroadcaster: true
        };
        openaiLib.answerToMessage(userData, transcription).then((answerMessage) => {
            bot.say(channelName, answerMessage);
        });
    };

    // Add the action to the queue
    voiceHandler.addActionToQueue(onTranscriptionAction);
    res.sendStatus(200);
});

async function getViewerInfos(viewer_name) {
    const user = await apiClient.users.getUserByName(viewer_name);
    const broadcaster = await apiClient.users.getUserByName(channelName);
    if (user.id === broadcaster.id) {
        return {
            name: viewer_name,
            isBroadcaster: true,
        }
    } else {
        try {
            const channel = await apiClient.channels.getChannelInfoById(broadcaster.id);
            const isSub = await user.getSubscriptionTo(broadcaster.id);
            const isFollow = await user.getFollowedChannel(broadcaster.id);
            const isVip = await broadcasterApiClient.channels.checkVipForUser(channel, user);
            const isMod = await broadcasterApiClient.moderation.checkUserMod(channel, user);
            return {
                name: viewer_name,
                isModerator: isMod ? true : false,
                isSubscriber: isSub ? true : false,
                isVip: (isVip || isMod) ? true : false,
                isFollower: isFollow ? true : false,
            }
        } catch (e) {
            if (enableDebug) {
                console.log(e);
            }
            return {
                name: viewer_name
            }
        }
    }
}

// Start the Express server
const port = process.env.PORT_NUMBER || 3000;
app.listen(port, () => {
    console.log(`Twitch bot listening at http://localhost:${port}`);
});


main();