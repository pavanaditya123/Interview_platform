import { StreamChat } from "stream-chat"
import { ENV } from "./env.js"


const apiKey = ENV.STREAM_API_KEY
const api_secret = ENV.STREAM_SECRET_KEY

if (!apiKey || !api_secret) {
    console.error("Stream_api_key or secret key is missing ");
}

export const chatClient = StreamChat.getInstance(apiKey, api_secret);

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


//todo :add another method to generate the token