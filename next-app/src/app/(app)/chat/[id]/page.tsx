"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, CheckCheck, Send } from "lucide-react";
import axios from "axios";
import React, { memo, useEffect, useRef, useState } from "react";
import { Chat, Message, User } from "@prisma/client";
import { useContext } from "react";
import { SocketContext, UserContext, UserWithId } from "../../layout";
import { useParams } from "next/navigation";
import { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import validator from "validator"
 
interface CompleteChat extends Chat {
  messages: Message[]
  users: User[]
}

export default function Home() {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[] | null>([]);
  const [chat, setChat] = useState<CompleteChat | null>(null);
  const session = useContext(UserContext);
  const socketConnection = useContext(SocketContext);
  const { id } = useParams();

  const handleSend = async () => {
    if(!message.trim()) return;
    const receivedMessage:Message = {
      chatId: chat?.id as string,
      content: message as string,
      userId: session?.user?.id as string,
      createdAt: new Date(),
      updatedAt: new Date(),
      received: false,
      read: false,
      id: uuidv4()
    }
    socketConnection?.socket?.emit('message', { message:receivedMessage, sendId:chat?.users.find((user) => user.id !== session?.user?.id)?.id })
    // console.log(receivedMessage, chat?.users.find((user) => user.id !== session?.user?.id)?.id, session?.user?.id);
    setMessages((prev) => [...prev || [], receivedMessage]);
    setMessage('')
  }

  useEffect(() => {
    if (!socketConnection?.socket) return;

    // console.log("In socket", session?.user?.id, socketConnection.socket.id);

    socketConnection?.socket.on("connect", () => {
      console.log("Socket connected", socketConnection?.socket.id);
    });

    socketConnection?.socket.emit("subscribe", "receive-message");

    socketConnection?.socket.on("receive-message", (message: Message, type: string, fakeMesg: Message) => {
      // console.log("Received message", message);
      if(type === "real" && fakeMesg){
        console.log("Updating message", message, fakeMesg, type);
        setMessages((prev) => (prev ? prev.map((mesg) => mesg.id === fakeMesg.id? message : mesg ) : []));
        return;
      }

      setMessages((prev) => [...prev || [], message]);
    });

    socketConnection?.socket.on("receive-read-message", (message:Message) => {
      console.log("Received read message", message);
      setMessages((prev) => (prev ? prev.map((mesg) => mesg.id === message.id ? {...message, read:true} : mesg) : []));
    })

    socketConnection?.socket.on("receiver-status", (message:Message, userStatus:boolean) => {
      // console.log("Receiver status", message, userStatus);
      if(!userStatus){
        console.log("User is offline");
        setMessages((prev) => (prev ? prev.map((mesg) => mesg.id === message.id ? {...message, received:false} : mesg) : []));
        axios.post("/api/message", { message:message.content, chatId:id, userId:session?.user?.id, received:false })
        .then((res) => {
          console.log("Message sent", res?.data);
          setMessages((prev) => (prev ? prev.map((mesg) => mesg.id === message.id ? res?.data.sentMessage : mesg) : []));
          socketConnection?.socket?.emit("update-message", { message: res?.data.sentMessage, fakeMesg:message, userId:chat?.users.find((user) => user.id !== session?.user?.id)?.id  });
        })
        return;
      }
      setMessages((prev) => (prev ? prev.map((mesg) => mesg.id === message.id ? {...message, received:true} : mesg) : []));
      axios.post("/api/message", { message:message.content, chatId:id, userId:session?.user?.id, received:true })
      .then((res) => {
        console.log("Message sent", res?.data);
        setMessages((prev) => (prev ? prev.map((mesg) => mesg.id === message.id ? res?.data.sentMessage : mesg) : []));
        console.log("bhai",chat)
        socketConnection?.socket?.emit("update-message", { message: res?.data.sentMessage, fakeMesg:message, userId:chat?.users.find((user) => user.id !== session?.user?.id)?.id  });
      })
    })

    socketConnection?.socket.on("set-receive-status", (message:Message) => {
      // console.log("Setting receive status", message);
      setMessages((prev) => (prev ? prev.map((mesg) => mesg.id === message.id ? {...message, received:true} : mesg) : []));
    })

    socketConnection?.socket.on("disconnect", () => {
      socketConnection?.socket.emit("unsubscribe", "receive-message");
      console.log("Socket disconnected");
    });

    return () => {
      socketConnection?.socket.emit("unsubscribe", "receive-message");
      socketConnection?.socket?.off("connect");
      socketConnection?.socket?.off("receive-message");
      socketConnection?.socket?.off("receiver-status");
      socketConnection?.socket?.off("set-receive-status");
      socketConnection?.socket?.off("receive-read-message");
      socketConnection?.socket?.off("disconnect");
    };
  }, [socketConnection, session?.user?.id, id, chat])

  const getChat = async () => {
    const res = await axios.get(`/api/get-chat/${id}`);
    if(!res?.data){
      return
    }
    console.log("Chat fetched", res?.data.data);
    setChat(res?.data.data);
    setMessages(res?.data.data.messages.reverse());
  }

  useEffect(() => {
    const chatScrollElement = document.getElementById("chat-scroll");
    if (chatScrollElement) {
      chatScrollElement.scrollTo({ top: chatScrollElement.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    getChat();
  }, [id]);

  return (
    <div className="relative font-[family-name:var(--font-geist-sans)] h-full w-full text-white flex flex-col">
        <div id="chat-scroll" className="flex-1 w-full overflow-auto">
          {
            socketConnection && session?.user && messages?.map((message) => (
              <ChatComponent key={message.id} message={message} user={session?.user} socket={socketConnection?.socket}/>
            ))
          }
        </div>
        {
          socketConnection?.socket && (
            <div className="w-full p-1 flex space-x-3">
              <Input
               className="border-gray-400" 
               value={message} 
               placeholder="Type a message"
               onChange={(e) => setMessage(e.target.value)}
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

const ChatComponent = memo(({message, user, socket}:{message:Message, user:UserWithId, socket:Socket}) => {
  const messageRef = useRef<HTMLDivElement>(null);
    
  useEffect(() => {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if(entry.isIntersecting && !message.read){
            await axios.patch(`/api/read-messages`, { messageId: message.id });
        } else {
        }
      },
      { threshold: 0.5 } // Trigger when at least 50% of the message is visible
    );

    if(messageRef.current && !message.read && message.userId !== user.id){
      if(validator.isUUID(message.id)){
        return;
      }
      socket.emit("read-message", { message });
      console.log("Observing", message.id);
      observer.observe(messageRef.current);
    }

    return () => {
      if(messageRef.current){
        observer.unobserve(messageRef.current);
      }
    };
  },[message, messageRef])


  return (
    <div ref={messageRef} className={`flex m-3 ${message.userId === user.id? "justify-end" : "justify-start"}`}>
      <div className="relative p-2 bg-gray-800 text-white rounded-lg">
        <div className="mr-5">
          {message.content}
        </div>
        {
          message.userId === user.id && (
            <div className="absolute -bottom-1 right-2">
              { message.received?  
                message.read ? 
                (<CheckCheck className="w-3 text-blue-500"/>) : 
                (<CheckCheck className="w-3 text-gray-400"/>) :
                <Check className="w-3 text-gray-400"/> 
              }
            </div>
          )
        }
      </div>
    </div>
  )
})

ChatComponent.displayName = "ChatComponent";
