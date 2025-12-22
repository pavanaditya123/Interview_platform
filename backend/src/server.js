import express from "express";
import { ENV } from "./lib/env.js";
import path from "path";
import { connectDB } from "./lib/db.js";
const app = express();

const __dirname = path.resolve();


app.get("/health", (req, res) => {
    res.status(200).json({ msg: "success from 1234" });
});

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


const startServer=async()=>{
    try{
        await connectDB();
        app.listen(ENV.PORT, () => 
            console.log("server is running on the port", ENV.PORT));
    }

    catch(error){
        console.error("error starting the server ",error)
    }
}



startServer();