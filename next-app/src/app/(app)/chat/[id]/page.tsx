"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import axios from "axios";
import React, { memo, useEffect, useState } from "react";
import { Chat, Message, User } from "@prisma/client";
import { useContext } from "react";
import { SocketContext, UserContext, UserWithId } from "../../layout";
import { useParams } from "next/navigation";

interface CompleteChat extends Chat {
  messages: Message[]
  users: User[]
}

export default function Home() {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[] | null>([]);
  const [chat, setChat] = useState<CompleteChat | null>(null);
  const [unsendMessages, setUnsendMessages] = useState<Message[]>([]);
  const session = useContext(UserContext);
  const socketConnection = useContext(SocketContext);
  const { id } = useParams();

  useEffect(() => {
    if (!socketConnection?.socket) return;

    console.log("In socket", session?.user?.id, socketConnection.socket.id);

    socketConnection?.socket.on("connect", () => {
      console.log("Socket connected", socketConnection?.socket.id);
    });

    socketConnection?.socket.on("receive-message", (message:Message, type:string, fakeMesg:Message) => {
      console.log("Received message", message);
      if(type === "real" && fakeMesg){
        setMessages((prev) => (prev ? prev.map((mesg) => mesg.id === fakeMesg.id ? message : mesg) : []));
        return;
      }

      setMessages((prev) => [...prev || [], message]);
      setUnsendMessages((prev) => [...prev || [], message]);
      axios.post("/api/message", { message:message.content, chatId:id, userId:`${message.userId}` })
      .then((res) => {
        console.log("Message sent", res?.data);
        const mesg = unsendMessages[0];
        if(mesg){
          const wrongId = mesg.id as string;
          setUnsendMessages((prev) => prev?.filter((message) => message.id !== wrongId));
          setMessages((prev) => (prev ? prev.map((message) => message.id === wrongId ? res?.data.sentMessage : message) : []));
          console.log("updating");
          socketConnection?.socket?.emit("update-message", { message: res?.data.sentMessage, fakeMesg:mesg, userId: mesg.userId });
        }
      })
    });

    socketConnection?.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socketConnection?.socket?.off("connect");
      socketConnection?.socket?.off("receive-message");
      socketConnection?.socket?.off("disconnect");
    };
  }, [socketConnection, session?.user?.id])

  const getChat = async () => {
    const res = await axios.get(`/api/get-chat/${id}`);
    if(!res?.data){
      return
    }
    setChat(res?.data.data);
    setMessages(res?.data.data.messages);
  }

  useEffect(() => {
    getChat();
  }, []);

  return (
    <div className="relative font-[family-name:var(--font-geist-sans)] h-full w-full text-white flex flex-col">
        <div className="flex-1 w-full overflow-auto">
          {
            session?.user && messages?.map((message) => (
              <ChatComponent key={message.id} message={message} user={session?.user}/>
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
              <Button size={"icon"} onClick={() => {
                const receivedMessage:Message = {
                  chatId: chat?.id as string,
                  content: message as string,
                  userId: session?.user?.id as string,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  id: Math.random().toString()
                }
                socketConnection?.socket?.emit('message', { message:receivedMessage, sendId:`${chat?.users.find((user) => user.id !== session?.user?.id)?.id}`, userId:session?.user.id as string }); 
                console.log(receivedMessage, chat?.users.find((user) => user.id !== session?.user?.id)?.id, session?.user?.id);
                setMessages((prev) => [...prev || [], receivedMessage]);
                setMessage('')
                }}>
                  <Send/>
              </Button>
            </div>
          )
        }
        <div>{}</div>
    </div>
  );
}

const ChatComponent = memo(({message, user}:{message:Message, user:UserWithId}) => {
  return (
    <div className={`flex m-3 ${message.userId === user.id? "justify-end" : "justify-start"}`}>
      <div className="p-2 bg-gray-800 text-white rounded-lg">
        {message.content}
      </div>
    </div>
  )
})

ChatComponent.displayName = "ChatComponent";
