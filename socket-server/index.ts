import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"]
    },
});

interface Sockets {
  [key: string]: string;
}

const sockets: Sockets = {};

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;
    sockets[userId] = socket.id;
    console.log('a user connected', socket.id, userId, io.sockets.sockets.size);
    
    io.to(userId).emit('online-status', userId, true);

    socket.on("join-room",({id}) => {
        socket.join(id);
    })

    socket.on("message", async ({chatId, content}) => {
        const tempId = uuidv4();

        const tempMessage = {
            id: tempId,  // Temporary ID
            chatId,
            userId,
            content,
            createdAt: new Date(),
            received: false,
            read: false
        };
        
        console.log(socket.rooms)
        io.to(chatId).emit("receive-message", tempMessage);
        io.to(chatId).emit("receive-message-background", tempMessage);

        try {
            // Save the message in the database
            const savedMessage = await prisma.message.create({
                data: {
                    chat: { connect: { id: chatId } },
                    user: { connect: { id: userId } },
                    content,
                }
            });
    
            // Send the correct ID to update the frontend
            io.to(chatId).emit("update-message-id", { tempMessage, realMessage: savedMessage });
            io.to(chatId).emit("update-message-id-background", { tempMessage, realMessage: savedMessage });
        } catch (error) {
            console.error("Message saving failed", error);
            io.to(chatId).emit("message-error", { tempId });
        }
    })

    socket.on("message-received", async ({messageId}) => {
        const message = await prisma.message.update({
            where: {
                id: messageId
            },
            data: {
                received: true
            }
        })

        io.to(message.chatId).emit("message-received", message);
    })

    socket.on("message-read", async ({messageId}) => {
        const message = await prisma.message.update({
            where: {
                id: messageId
            },
            data: {
                read: true
            }
        })

        io.to(message.chatId).emit("message-read", message);
    })

    socket.on("online-status", ({userId}) => {
        io.to(userId).emit('online-status', userId, !!sockets[userId]);
    })

    socket.on("typing", ({userId, isTyping}) => {
        io.to(userId).emit("typing", userId, isTyping);
    })

    socket.on("notification", ({notification}) => {
        io.to(sockets[notification.targetId]).emit("notification", notification);
    })

    socket.on("notification-update", async ({notification}) => {
        io.to(sockets[notification.targetId]).emit("notification-update", notification);
    })

    socket.on("leave-room",({id}) => {
        socket.leave(id);
    })

    socket.on("disconnect", async () => {
        delete sockets[userId];
        console.log('a user disconnected', userId, io.sockets.sockets.size);
        io.to(userId).emit('online-status', userId, false);
        socket.disconnect();
    })
})

server.listen(8000, () => {
    console.log('listening on port:8000');
});
