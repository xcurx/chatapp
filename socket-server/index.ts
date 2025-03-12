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

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  sockets[userId] = socket.id;
  console.log('a user connected', socket.id, userId, io.sockets.sockets.size);

  socket.on("subscribe", ({event, chatId}) => {
    console.log("Subscribing to", event, chatId);
    let subscription = userSubscriptions.get(socket.id);
  
    const subscriptionKey = JSON.stringify({ event, chatId }); 

    if (subscription?.has(subscriptionKey)) {
      console.log("Already subscribed");
      return;
    }

    if (!subscription) {
      subscription = new Set<string>();
      userSubscriptions.set(socket.id, subscription);
    }

    // Check if the user is already subscribed to the same event with a different chatId
    for (let key of subscription) {
      const parsedKey = JSON.parse(key);
      if (parsedKey.event === event && parsedKey.chatId !== chatId) {
        console.log(`Already subscribed to event ${event} with a different chatId`);
        return;
      }
    }

    subscription.add(subscriptionKey);
  });

  socket.on("unsubscribe", ({event, chatId}) => {
    console.log("Unsubscribing from", event, chatId);
    const subscription = userSubscriptions.get(socket.id);
    const subscriptionKey = JSON.stringify({ event, chatId });
  
    if (subscription) {
      subscription.delete(subscriptionKey);
      if (subscription.size === 0) {
        userSubscriptions.delete(socket.id);
      }
    }
  });
 
  socket.on('message', ({message, sendId}) => {
    console.log('message: ' + message,"to",sockets[sendId],"of",sendId);
    const userStatus = checkOnlineStatus(sendId);
    console.log('userStatus: ' + userStatus);
    if(userStatus){
      message = {...message, received:true};
    }
    receiverStatus(message, userStatus);
    const type = "fake";
    receiveMessage(sendId, message, type, null);
  });

  socket.on('update-message', ({message, fakeMesg, userId}) => {
    console.log('update-message: ' + message.content, userId);
    const type = "real";
    receiveMessage(userId, message, type, fakeMesg);
  })

  socket.on("read-message", ({message}) => {
    receiveReadMessage(message);
  })

  socket.on("change-receive-status", ({message}) => {
    message.read_count = undefined
    setReceiveStatus(message);
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

function receiveMessage(sendId:string, message:any, type?:string, fakeMesg?:object | null) {
  const userSocketId = sockets[sendId]
  console.log("subscribed users: ", userSubscriptions);
  if(userSubscriptions.get(userSocketId)?.has(JSON.stringify({ event: "receive-message", chatId: message.chatId }))){
    console.log('function: ' + message.content, userSocketId, type, fakeMesg);
    io.to(userSocketId).emit("receive-message", message, type, fakeMesg);
    // io.to(userSocketId).emit("background-message", message, type, fakeMesg);
  }else{
    console.log('function: ' + message.content, userSocketId, type, fakeMesg);
    console.log(`User ${userSocketId} is not listening to '${"receive-message"}'`);
    io.to(userSocketId).emit("background-message", message, type, fakeMesg);
  }
}

function receiveReadMessage(message:any) {
  const userSocketId = sockets[message.userId];
  console.log(userSubscriptions)
  if(userSubscriptions.get(userSocketId)?.has(JSON.stringify({ event: "receive-read-message", chatId: message.chatId }))){
    io.to(userSocketId).emit("receive-read-message", message);
  }else{
    console.log(`User ${userSocketId} is not listening to '${"receive-read-message"}'`);
  }
}

function receiverStatus(message:any, userStatus:boolean) {
  console.log(userSubscriptions)
  const userSocketId = sockets[message.userId];
  if(userSubscriptions.get(userSocketId)?.has(JSON.stringify({ event: "receiver-status", chatId: message.chatId }))){
    io.to(userSocketId).emit("receiver-status", message, userStatus);
  }else{
    console.log(`User ${userSocketId} is not listening to '${"receiver-status"}'`);
  }
}

function setReceiveStatus(message:any) {
  const userSocketId = sockets[message.userId];
  if(userSubscriptions.get(userSocketId)?.has(JSON.stringify({ event: "set-receive-status", chatId: message.chatId }))){
    io.to(userSocketId).emit("set-receive-status", message);
  }else{
    console.log(`User ${userSocketId} is not listening to '${"set-receive-status"}'`);
  }
}

const checkOnlineStatus = (userId:string) => {
  return !!sockets[userId];
}
