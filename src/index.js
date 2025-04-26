import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { createServer } from "http";
import fileUpload from 'express-fileupload';

import routes from './routes/index.js';
import db from './config/db/index.js';
import { connectToAWSIoT } from './util/AWSIoTCore.js';

import { initWebSocket } from './config/websocket/index.js';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 4000;

// CORS middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization'
    ],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Connect DB
db.connectDB();

// HTTP Logger
app.use(morgan('combined'));

// Router
routes(app);

// Khởi tạo WebSocket
initWebSocket(httpServer);

// Kết nối AWS IoT Core
connectToAWSIoT();

// Start the server using httpServer instead of app
httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
