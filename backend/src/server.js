import express from "express";
import { ENV } from "./lib/env.js";
import path from "path";
import { connectDB } from "./lib/db.js";
import { inngest } from "./lib/inngest.js";
const app = express();

const __dirname = path.resolve();

//middlewares
app.use(express.json());
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));

app.use("/api/ingest", serve({ client: inngest, functions }));
if (ENV.NODE_ENV == "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));
    app.get("/{*any}", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
    });

}

//make our app ready for deployment
app.listen(ENV.PORT, () => {
    console.log("server is running on the port", ENV.PORT);
    connectDB();
}
);


const startServer = async () => {
    try {
        await connectDB();
        app.listen(ENV.PORT, () =>
            console.log("server is running on the port", ENV.PORT));
    }

    catch (error) {
        console.error("error starting the server ", error)
    }
}



startServer();