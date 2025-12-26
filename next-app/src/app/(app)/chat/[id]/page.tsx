"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { Chat, Message, User } from "@prisma/client";
import { useContext } from "react";
import { SocketContext, UserContext } from "../../layout";
import { useParams } from "next/navigation";
import Loader from "@/components/helpers/Loader";
import MessageLoader from "@/components/helpers/MessageLoader";
import MessageComponent from "@/components/helpers/MessageComponent";
import { Send } from "lucide-react";
import useGetMessages from "@/hooks/useGetMessages";
 
interface CompleteChat extends Chat {
  messages: Message[]
  users: User[]
}

export default function Home() {
  const [message, setMessage] = useState<string>('');
  const [chat, setChat] = useState<CompleteChat | null>(null);
  const session = useContext(UserContext);
  const socketConnection = useContext(SocketContext);
  const { id } = useParams();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const chatScrollRef= useRef<HTMLDivElement>(null);
  const { messages, 
          loadingMessages, 
          setMessages, 
          setIsUpdating, 
          setLatestMessageCursor, 
          latestMessageCursor, 
          setLowerCursor, 
          lowerCursor 
        } = useGetMessages(id, 50, chatScrollRef);

const actionsQueueRef = useRef<Message[]>([]);

// Add actions to the queue
const addToQueue = (action:Message) => {
  actionsQueueRef.current.push(action);
};

// Process queue with debouncing to prevent stack overflow
const isProcessingRef = useRef(false);
const processQueue = () => {
  if (isProcessingRef.current || actionsQueueRef.current.length === 0) return;
  
  isProcessingRef.current = true;
  
  while (actionsQueueRef.current.length > 0) {
    const message = actionsQueueRef.current.shift();
    if(message){
      setMessages((prev) => (prev || []).map((msg) => msg.id === message.id ? message : msg));
    }
  } 

  isProcessingRef.current = false;
  // setTimeout(() => {
  //   isProcessingRef.current = false;
  //   processQueue();
  // }, 0);
};

  const handleSend = async () => {
    if(!message.trim()) return;
    socketConnection?.socket?.emit('message', { chatId:id, content:message });
    setMessage('')
  }

  useEffect(() => {
    if (!socketConnection?.socket || !id) return;
    socketConnection?.socket.emit("join-room", { id });
    
    socketConnection?.socket.on("receive-message", async (message:Message) => {
      console.log("receive-message", lowerCursor, latestMessageCursor);
      if(latestMessageCursor === lowerCursor){
        setMessages((prev) => [...prev || [], message]);
        setLowerCursor(message.id);
      }
      setLatestMessageCursor(message.id);
    });

    socketConnection.socket.on("update-message-id", ({ tempMessage, realMessage }) => {
      if(latestMessageCursor === lowerCursor){
        setIsUpdating(true);
        setMessages((prev) =>
            (prev || []).map(msg => msg.id === tempMessage.id ? realMessage : msg)
        );
        if(realMessage.userId !== session?.user?.id){
          socketConnection?.socket.emit("message-received", { messageId:realMessage.id });
        }
        setTimeout(() => {
          setIsUpdating(false);
        }, 500)
        setLowerCursor(realMessage.id);
      }
      setLatestMessageCursor(realMessage.id);
    });

    socketConnection?.socket.on("message-received", (message:Message) => {
      if(messages.includes(message)){
        // setMessages((prev) => (prev || []).map((msg) => msg.id === message.id ? message : msg));
        addToQueue(message);
      }
    });

    socketConnection?.socket.on("message-read", (message:Message) => {
      // if(messages.includes(message)){
        setMessages((prev) => (prev || []).map((msg) => msg.id === message.id ? message : msg));  
      // }
    });

    return () => {
      socketConnection?.socket.emit("leave-room", { id });
      socketConnection?.socket.off("connect");
      socketConnection?.socket.off("receive-message");
      socketConnection?.socket.off("update-message-id");
      socketConnection?.socket.off("message-received");
      socketConnection?.socket.off("message-read");
    };
  }, [socketConnection?.socket, id, chat, latestMessageCursor, lowerCursor]);

  const getChat = async () => {
    const res = await axios.get(`/api/get-chat/${id}`);
    if(!res?.data){
      return
    }
    setChat(res?.data.data);
  }

  useEffect(() => {
    if(isProcessingRef.current) return;
    processQueue();
  }, [actionsQueueRef.current, messages]);

  useEffect(() => {
    getChat();
  }, [id]);

  if(!chat || !socketConnection?.socket || !messages){
    return <div className="w-full h-full flex justify-center items-center"><Loader/></div>
  }

  return (
    <div className="relative font-[family-name:var(--font-geist-sans)] h-full w-full text-white flex flex-col">
        <div ref={chatScrollRef} className="flex-1 w-full overflow-auto">
          {
            loadingMessages.upward && <div className="w-full flex justify-center items-center"><MessageLoader/></div>
          }
          {
            socketConnection && session?.user && messages?.map((message) => (
              <MessageComponent key={message.id} message={message} user={session?.user} socket={socketConnection?.socket}/>
            ))
          }
          {
            loadingMessages.downward && <div className="w-full flex justify-center items-center"><MessageLoader/></div>
          }
        </div>
        {
          socketConnection?.socket && (
            <div className="w-full py-2 px-3 flex space-x-3">
              <Input
               className="border-zinc-600 focus:border-zinc-400" 
               value={message} 
               placeholder="Type a message"
               onChange={(e) => {
                  setMessage(e.target.value);
                  if(!isTyping){
                    socketConnection?.socket?.emit("typing", { userId:session?.user?.id, isTyping:e.target.value.length > 0 });
                       
                    setTimeout(() => {
                      setIsTyping(false);
                      socketConnection?.socket?.emit("typing", { userId:session?.user?.id, isTyping:false });
                    },2000)
                  }
               }}
              />
              <Button size={"icon"} onClick={handleSend}>
                  <Send/>
              </Button>
            </div>
          )
        }
        <div>{}</div>
    </div>
  );
}

