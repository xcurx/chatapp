import axios from 'axios';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    },
});

interface Sockets {
  [key: string]: string;
}

const userSubscriptions = new Map<string, Set<string>>(); 

const sockets: Sockets = {};

function receiveMessage(userSocketId:string, message:object, type?:string, fakeMesg?:object | null) {
  if (userSubscriptions.get(userSocketId)?.has("receive-message")) {
    console.log('function: ' + message, userSocketId, type, fakeMesg);
    io.to(userSocketId).emit("receive-message", message, type, fakeMesg);
  }else{
    console.log(`User ${userSocketId} is not listening to '${"receive-message"}'`);
    io.to(userSocketId).emit("background-message", message, type, fakeMesg);
  }
}

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  sockets[userId] = socket.id;
  console.log('a user connected', socket.id, userId, io.sockets.sockets.size);

  socket.on("subscribe", (event:string) => {
    let subscription = userSubscriptions.get(socket?.id as string);
    if (!subscription) {
        subscription = new Set<string>();
        userSubscriptions.set(socket?.id as string, subscription);
    }
    subscription.add(event);
  });

  socket.on("unsubscribe", (event:string) => {
    const subscription = userSubscriptions.get(socket?.id as string);
    if (subscription) {
        subscription.delete(event);
        if (subscription.size === 0) {
            userSubscriptions.delete(socket?.id as string);
        }
    }
  });
 
  socket.on('message', ({message, sendId, userId}) => {
    console.log('message: ' + message, userId,"to",sockets[sendId],"of",sendId);
    const type = "fake";
    receiveMessage(sockets[sendId], message, type, null);
  });

  socket.on('update-message', ({message, fakeMesg, userId}) => {
    console.log('update-message: ' + message, userId);
    const type = "real";
    receiveMessage(sockets[userId], message, type, fakeMesg);
  })

  socket.on('notification', ({targetId, notification}) => {
    console.log('notification: ' + notification, targetId);
    io.to(sockets[targetId]).emit('receive-notification', notification);
  })

  socket.on('disconnect', async () => {
    // const res = await axios.delete("http://localhost:3000/api/delete-socket");
    // console.log(res.data);
    delete sockets[userId];
    userSubscriptions.delete(socket.id)
    console.log('user disconnected');
  });
});

server.listen(8000, () => {
  console.log('listening on port:8000');
});
