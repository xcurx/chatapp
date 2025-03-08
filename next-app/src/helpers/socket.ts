import { io, Socket as SocketType } from "socket.io-client";

export default class Socket{
    private url: string;
    public socket: SocketType | null;
    public message: string;

    constructor(url: string) {
        this.url = url;
        this.socket = null;
        this.message = '';
    }

    connect = ():void => {
        if(this.socket){
            console.log('Socket.IO connection already exists');
            return;
        }
        this.socket = io(this.url);
        this.socket.on('connect', () => {
            console.log('Socket connected', this.socket?.id);
        });
        this.socket.on('recieve-message', (message: string) => {
            console.log('Message recieved: ', message);
            this.message = message;
        });
        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
    };

    disconnect = (): void => {
        if(this.socket){
            this.socket.disconnect();
            console.log('Socket connection closed during cleanup');
        }
    };

    sendMessage = (message: string, socketId:string): void => {
        console.log('Sending message: ', message);
        if(this.socket){
            this.socket.emit('message', {message, socketId});
        }
    };
}