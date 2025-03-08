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

const sockets: Sockets = {};

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  sockets[userId] = socket.id;
  console.log('a user connected', socket.id, userId, io.sockets.sockets.size);
 
  socket.on('message', ({message, sendId, userId}) => {
    console.log('message: ' + message, userId,"to",sockets[sendId],"of",sendId);
    const type = "fake";
    io.to(sockets[sendId]).emit('receive-message', message, type);
  });

  socket.on('update-message', ({message, fakeMesg, userId}) => {
    console.log('update-message: ' + message, userId);
    const type = "real";
    io.to(sockets[userId]).emit("receive-message", message, type, fakeMesg);
  })

  socket.on('notification', ({targetId, notification}) => {
    console.log('notification: ' + notification, targetId);
    io.to(sockets[targetId]).emit('receive-notification', notification);
  })

  socket.on('disconnect', async () => {
    // const res = await axios.delete("http://localhost:3000/api/delete-socket");
    // console.log(res.data);
    delete sockets[userId];
    console.log('user disconnected');
  });
});

server.listen(8000, () => {
  console.log('listening on port:8000');
});
