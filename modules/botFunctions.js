
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
                            "description": "The question that viewers will vote on. For example, What game should I play next? The question may contain a maximum of 60 characters.",
                        },
                        "choices": {
                            "type": "array",
                            "description": "A list of choices that viewers may choose from. The list must contain a minimum of 2 choices and up to a maximum of 5 choices. The choice may contain a maximum of 25 characters.",
                            "items": {
                                "type": "string"
                            }
                        },
                        "duration": {
                            "type": "number",
                            "description": "The length of time (in seconds) that the poll will run for. The minimum is 15 seconds and the maximum is 1800 seconds (30 minutes). (default: 300s (5minutes))"
                        },
                    },
                    "required": ["question", "choices", "duration"]
                },
            },
            "function_to_call": async ({ question, choices, duration }) => {
                let data = {
                    title: question.substring(0, 60),
                    choices: choices.map(choice => choice.substring(0, 25)),
                    duration: duration,
                };

                console.log("Create poll: " + JSON.stringify(data));
                const poll = await broadcasterApiClient.polls.createPoll(broadcasterId, data);
                return "Poll created successfully ! Poll ID for future reference: " + poll.id

            },
        },
        {
            "name": "manage_poll",
            "onlyBroadcaster": true,
            "gptFunction": {
                "name": "manage_poll",
                "description": "Manage / Get Information of a created poll on Twitch by its ID",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["get", "end"],
                            "description": "The action to perform on the poll. This could be 'end' or 'get'."
                        },
                        "poll_id": {
                            "type": "string",
                            "description": "The ID of the poll to manage."
                        }
                    },
                    "required": ["action", "poll_id"]
                },
            },
            "function_to_call": async ({ action, poll_id, show_result = true }) => {
                console.log(`Manage poll: ${action} on poll ID: ${poll_id}`);
                switch (action) {
                    case 'end':
                        const pollEndResult = await broadcasterApiClient.polls.endPoll(broadcasterId, poll_id, show_result);
                        return `Poll ended successfully. Result: ${JSON.stringify(pollEndResult)}`;
                    case 'get':
                        const pollInfo = await broadcasterApiClient.polls.getPollById(broadcasterId, poll_id);
                        if (!pollInfo) {
                            return `Poll with ID ${poll_id} not found.`;
                        }
                        let choices = [];
                        for (let i = 0; i < pollInfo.choices.length; i++) {
                            choices.push({ title: pollInfo.choices[i].title, totalVotes: pollInfo.choices[i].totalVotes });
                        }

                        let returnData = {
                            status: pollInfo.status,
                            title: pollInfo.title,
                            choices: choices,
                        }

                        return `Poll information: ${JSON.stringify(returnData)}`;
                    default:
                        return 'Invalid action provided. Available actions are "end" and "get".';
                }
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
                            "description": "The question that the broadcaster is asking. For example, Will I finish this entire pizza? The title is limited to a maximum of 45 characters.",
                        },
                        "outcomes": {
                            "type": "array",
                            "description": "The list of possible outcomes that the viewers may choose from. The list must contain a minimum of 2 choices and up to a maximum of 10 choices. The title is limited to a maximum of 25 characters.",
                            "items": {
                                "type": "string"
                            }
                        },
                        "auto_lock_after": {
                            "type": "number",
                            "description": "The duration of the prediction in minutes (default: 10min)"
                        },
                    },
                    "required": ["title", "outcomes", "auto_lock_after"]
                },
            },
            "function_to_call": async ({ title, outcomes, auto_lock_after }) => {
                let data = {
                    title: title.substring(0, 45),
                    outcomes: outcomes.map(outcome => outcome.substring(0, 25)),
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