import { Server } from "socket.io";

let io;

export const initWebSocket = (httpServer) => {
    const allowedOrigins = process.env.FRONTEND_URL 
        ? [process.env.FRONTEND_URL, 'http://localhost:3000'] 
        : '*';
    
    console.log('Initializing WebSocket with allowed origins:', allowedOrigins);
    
    io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true
        },
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        allowEIO3: true
    });

    // Create admin namespace
    const adminNamespace = io.of('/admin');

    // Admin namespace event handlers
    adminNamespace.on("connection", (socket) => {
        console.log("Admin client connected:", socket.id);
        console.log("Admin client handshake:", socket.handshake.address);

        socket.on("disconnect", (reason) => {
            console.log("Admin client disconnected:", socket.id, "reason:", reason);
        });
    });

    // Default namespace event handlers
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);
        console.log("Client address:", socket.handshake.address);
        console.log("Client query:", socket.handshake.query);
        console.log("Client transport:", socket.conn.transport.name);

        socket.on("joinUserRoom", (userId) => {
            socket.join(`user:${userId}`);
            console.log(`Client ${socket.id} joined room user:${userId}`);
        });

        socket.on("joinDeviceRoom", (deviceId) => {
            socket.join(`device:${deviceId}`);
            console.log(`Client ${socket.id} joined room device:${deviceId}`);
        });

        socket.on("disconnect", (reason) => {
            console.log("Client disconnected:", socket.id, "reason:", reason);
        });

        socket.on("error", (error) => {
            console.error("Socket error:", error);
        });

        // Send a welcome message to confirm connection
        socket.emit('welcome', { message: 'Connected to WebSocket server', socketId: socket.id });
    });

    io.engine.on("connection_error", (err) => {
        console.error("Connection error:", err.req, err.code, err.message, err.context);
    });

    return io;
};

// Hàm gửi thông báo đến tất cả client trong room của một user
export const notifyUser = (userId, event, data) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }
    io.to(`user:${userId}`).emit(event, data);
};

// Hàm gửi thông báo đến tất cả client trong room của một device
export const notifyDevice = (deviceId, event, data) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }
    io.to(`device:${deviceId}`).emit(event, data);
};

// Hàm gửi thông báo đến tất cả client
export const notifyAll = (event, data) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }
    io.emit(event, data);
};
