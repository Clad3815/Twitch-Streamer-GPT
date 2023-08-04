
function createBotFunctions(broadcasterApiClient, broadcasterId) {

    const botFunctions = [
        {
            "name": "create_poll",
            "onlyBroadcaster": true, // If true, only the broadcaster can use this function
            "gptFunction": {
                "name": "create_poll",
                "description": "Create a poll in the twitch chat",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "question": {
                            "type": "string",
                            "description": "The question to ask in the poll",
                        },
                        "answers": {
                            "type": "array",
                            "description": "The answers to the poll",
                            "items": {
                                "type": "string"
                            }
                        },
                        "duration": {
                            "type": "number",
                            "description": "The duration of the poll in seconds (default: 30s)"
                        },
                    },
                    "required": ["question", "answers", "duration"]
                },
            },
            "function_to_call": async ({ question, answers, duration }) => {
                let data = {
                    title: question,
                    choices: answers,
                    duration: duration,
                };

                console.log("Create poll: " + JSON.stringify(data));
                await broadcasterApiClient.polls.createPoll(broadcasterId, data);
                return "Poll created successfully !"

            },
        },
        {
            "name": "create_prediction",
            "onlyBroadcaster": true,  // If true, only the broadcaster can use this function
            "gptFunction": {
                "name": "create_prediction",
                "description": "Create a prediction in the twitch chat",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "The title of the prediction (max 25 characters)",
                        },
                        "outcomes": {
                            "type": "array",
                            "description": "The outcomes of the prediction",
                            "items": {
                                "type": "string"
                            }
                        },
                        "auto_lock_after": {
                            "type": "number",
                            "description": "The duration of the prediction in seconds (default: 30s)"
                        },
                    },
                    "required": ["title", "outcomes", "auto_lock_after"]
                },
            },
            "function_to_call": async ({ title, outcomes, auto_lock_after }) => {
                let data = {
                    title: title.substring(0, 25),
                    outcomes: outcomes,
                    autoLockAfter: auto_lock_after,
                }

                console.log("Create prediction: " + JSON.stringify(data));
                await broadcasterApiClient.predictions.createPrediction(broadcasterId, data);
                return "Prediction created successfully !"
            },
        },
        {
            "name": "update_stream_title",
            "onlyBroadcaster": true,  // If true, only the broadcaster can use this function
            "gptFunction": {
                "name": "update_stream_title",
                "description": "Update the title of the Twitch stream",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "The new title for the stream",
                        }
                    },
                    "required": ["title"]
                },
            },
            "function_to_call": async ({ title }) => {
                if (title.length < 1 || title.length > 100) {
                    return "Title must be between 1 and 100 characters!";
                }
        
                console.log("Updating stream title to: " + title);
                await broadcasterApiClient.channels.updateChannelInfo(broadcasterId, { title: title });
                return "Stream title updated successfully!";
            },
        },
        {
            "name": "get_streamer_info_and_status",
            "onlyBroadcaster": false,
            "gptFunction": {
                "name": "get_streamer_info_and_status",
                "description": "Get the online status and information of a streamer on Twitch",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "channelName": {
                            "type": "string",
                            "description": "The name of the channel to check"
                        }
                    },
                    "required": ["channelName"]
                }
            },
            "function_to_call": async ({ channelName }) => {
                console.log("Getting streamer info and status for: " + channelName);
                const stream = await broadcasterApiClient.streams.getStreamByUserName(channelName);
                
                if (stream) {
                    return JSON.stringify({
                        status: "online",
                        gameName: stream.gameName,
                        title: stream.title,
                        viewers: stream.viewers
                    });
                } else {
                    return JSON.stringify({ status: "offline" });
                }
            }
        }
        
    ];

    return botFunctions;
}

module.exports = { createBotFunctions };