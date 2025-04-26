import { Server } from "socket.io";

let io;

export const initWebSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true
        },
        path: '/socket.io'
    });

    // Create admin namespace
    const adminNamespace = io.of('/admin');

    // Admin namespace event handlers
    adminNamespace.on("connection", (socket) => {
        console.log("Admin client connected:", socket.id);

        socket.on("disconnect", () => {
            console.log("Admin client disconnected:", socket.id);
        });
    });

    // Default namespace event handlers
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("joinUserRoom", (userId) => {
            socket.join(`user:${userId}`);
            console.log(`Client ${socket.id} joined room user:${userId}`);
        });

        socket.on("joinDeviceRoom", (deviceId) => {
            socket.join(`device:${deviceId}`);
            console.log(`Client ${socket.id} joined room device:${deviceId}`);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });

        socket.on("error", (error) => {
            console.error("Socket error:", error);
        });
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
