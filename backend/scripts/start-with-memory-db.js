// Local development helper: runs the API against a throwaway in-memory MongoDB,
// so you can try the app without an Atlas cluster. Data is lost when the process stops.
import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create();
process.env.DB_URL = mongod.getUri("interview-platform");
console.log("Using in-memory MongoDB at", process.env.DB_URL);

const stop = async () => {
    await mongod.stop();
};
process.on("exit", stop);

await import("../src/server.js");
