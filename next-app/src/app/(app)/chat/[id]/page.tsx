"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { Chat, Message, User } from "@prisma/client";
import { useParams } from "next/navigation";
import Loader from "@/components/helpers/Loader";
import MessageLoader from "@/components/helpers/MessageLoader";
import MessageComponent from "@/components/helpers/MessageComponent";
import { Send } from "lucide-react";
import useGetMessages from "@/hooks/useGetMessages";
import { getSocket } from "@/lib/socket";
import { useSession } from "next-auth/react";
 
interface CompleteChat extends Chat {
  messages: Message[]
  users: User[]
}

export default function Home() {
  const [message, setMessage] = useState<string>('');
  const [chat, setChat] = useState<CompleteChat | null>(null);
  const {data:session} = useSession()
  const { id } = useParams();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const chatScrollRef= useRef<HTMLDivElement>(null);
  const { messages, 
          loadingMessages, 
        } = useGetMessages("", id, 50, chatScrollRef);
  const socket = getSocket()

  console.log("ID is", session?.user.id)

  const handleSend = async () => {
    if(!message.trim()) return;
    socket.emit('message', { chatId:id as string, content:message });
    setMessage('')
  }

  const getChat = async () => {
    const res = await axios.get(`/api/get-chat/${id}`);
    if(!res?.data){
      return
    }
    setChat(res?.data.data);
  }

  useEffect(() => {
    getChat();
  }, [id]);

  if(!chat || !socket || !messages){
    return <div className="w-full h-full flex justify-center items-center"><Loader/></div>
  }

  return (
    <div className="relative font-[family-name:var(--font-geist-sans)] h-full w-full text-white flex flex-col">
        <div ref={chatScrollRef} className="flex-1 w-full overflow-auto">
          {
            loadingMessages.upward && <div className="w-full flex justify-center items-center"><MessageLoader/></div>
          }
          {
            socket! && session?.user && messages?.map((message) => (
              <MessageComponent key={message.id} message={message} user={session?.user} socket={socket}/>
            ))
          }
          {
            loadingMessages.downward && <div className="w-full flex justify-center items-center"><MessageLoader/></div>
          }
        </div>
        {
          socket && (
            <div className="w-full py-2 px-3 flex space-x-3">
              <Input
               className="border-zinc-600 focus:border-zinc-400" 
               value={message} 
               placeholder="Type a message"
               onChange={(e) => {
                  setMessage(e.target.value);
                  if(!isTyping){
                    socket?.emit("typing", { userId:session?.user?.id!, isTyping:e.target.value.length > 0 });
                       
                    setTimeout(() => {
                      setIsTyping(false);
                      socket?.emit("typing", { userId:session?.user?.id!, isTyping:false });
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

