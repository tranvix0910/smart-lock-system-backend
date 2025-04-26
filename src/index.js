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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers'
    ],
    credentials: true
}));

// Preflight request handling
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Connect DB
db.connectDB();

// HTTP Logger
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('combined'));
}

// Status route to check if server is running
app.get('/status', (req, res) => {
    res.send({
        status: 'Server is running',
        env: process.env.NODE_ENV || 'development',
        frontendUrl: process.env.FRONTEND_URL || 'not set',
        websocketInitialized: global.socketServerInitialized || false
    });
});

// Router
routes(app);

console.log('=== WebSocket Initialization Starting ===');

// Initialize WebSocket with error handling and improved logging
let socketServer;
try {
    console.log('About to initialize WebSocket server...');
    socketServer = initWebSocket(httpServer);
    global.socketServerInitialized = true;
    console.log(`WebSocket server initialized successfully with CORS origin: ${process.env.FRONTEND_URL || '*'}`);
    
    // Verify namespaces are set up
    if (socketServer && socketServer.nsps) {
        console.log('Active namespaces:', Object.keys(socketServer.nsps));
    } else {
        console.warn('WebSocket server initialized but no namespaces found');
    }
} catch (error) {
    console.error('Error initializing WebSocket server:', error);
    console.error('Error stack:', error.stack);
    global.socketServerInitialized = false;
}

console.log('=== WebSocket Initialization Complete ===');

// Connect to AWS IoT Core
connectToAWSIoT();

// Start the server using httpServer instead of app
httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS allowed origin: ${process.env.FRONTEND_URL || '*'}`);
    console.log(`WebSocket initialized: ${global.socketServerInitialized}`);
    console.log(`Visit http://localhost:${port}/websocket-test to test WebSocket connection`);
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
