import { StreamChat } from "stream-chat"
import { ENV } from "./env.js"
import { StreamClient } from "@stream-io/node-sdk";

const apiKey = ENV.STREAM_API_KEY
const apiSecret = ENV.STREAM_API_SECRET


if (!apiKey || !apiSecret) {
    console.error("Stream_api_key or secret key is missing ");
}
export const streamClient = new StreamClient(apiKey, apiSecret);//iwll be used for video call features

export const chatClient = StreamChat.getInstance(apiKey, apiSecret);//for chat messaging
export const upsertStreamUser = async (userData) => {
    try {
        await chatClient.upsertUsers([userData])
        console.log("steam user updated succesfully", userData)
    }
    catch (error) {
        console.error("Error Updating the stream user:", error)

    }
}

export const deleteStreamUser = async (userId) => {
    try {
        await chatClient.deleteUser(userId)
        console.log("steam user deleted succesfully", userId)
    }
    catch (error) {
        console.error("Error deleting  the stream user:", error)

    }
}


