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

const allowedOrigins = [
    process.env.FRONTEND_URL_PROD,
    process.env.FRONTEND_URL_DEV,
];

// CORS middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Credentials'
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

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
