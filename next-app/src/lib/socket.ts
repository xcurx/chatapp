import { Message, Notification } from "@prisma/client";
import { io, Socket } from "socket.io-client";
import { getSession } from "next-auth/react";

interface ClientToServerEvents {
    "join-room": (data: { id: string }) => void;
    "message": (data: { chatId: string, content: string }) => void;
    "message-received": (data: { id: string }) => void;
    "leave-room": (data: {id: string}) => void;
    "typing": (data: {userId: string, isTyping: boolean}) => void;
    "online-status": (data: { userId: string, sendId: string }) => void;
    "notification": (data: {notification: Notification }) => void
    "notification-update": (data: {notification: Notification }) => void
}

interface ServerToClientEvents {
    "receive-message": (data: { message: Message }) => void;
    "update-message-id": (data: {tempMessage: Message, realMessage: Message }) => void;
    "message-received": (data: { message:Message }) => void;
    "message-read": (data: {message:Message}) => void
    "receive-message-background": (data: { message: Message }) => void;
    "update-message-id-background": (data: { tempMessage: Message, realMessage: Message }) => void
    "online-status": (data: { userId: string, status: boolean }) => void
    "typing": (data: {userId: string, status: boolean}) => void;
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
const session = await getSession()

export const getSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
    console.log("connecting with id",socket)
    if (!socket) {
        socket = io(
            process.env.NEXT_PUBLIC_SOCKET_URL,
            {
                query: { userId:session?.user.id },
                transports: ['websocket', 'pooling']
            }
        )
    }
    return socket;
}

export const connectSocket = (id:string) => {
    if (socket && !socket.connected) {
        socket.connect()
    }
}

export const disconnectSocket = (id:string) => {
    if (socket && socket.connected) {
        socket.disconnect()
    }
}