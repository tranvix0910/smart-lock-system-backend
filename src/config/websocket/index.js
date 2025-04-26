import { Server } from "socket.io";

let io;

export const initWebSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: [
                'Content-Type', 
                'Authorization',
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Headers',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Credentials'
            ],
            credentials: true
        }
    });

    // Socket.IO event handlers
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
    });

    io.engine.on("connection_error", (err) => {
        console.error("Connection error details:", {
            code: err.code,
            message: err.message,
            context: err.context,
            req: {
                url: err.req?.url,
                headers: err.req?.headers,
                method: err.req?.method
            }
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
