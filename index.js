import express from "express";
import { rateLimit } from "express-rate-limit";
import { dbConnect } from "./config/dbConnect.js";
import { configDotenv } from "dotenv";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js"
import productRouter from "./routes/product.js"

import { createServer } from "http";
import { initSocket } from "./config/socketConnection.js";
import cors from "cors";

configDotenv();

dbConnect();

const app = express();
const httpServer = createServer(app);
initSocket(httpServer);

// app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.status(200).send("votemaster poll server is running!!!!!!");
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/product", productRouter); 

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
