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
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [cursor, setCursor] = useState<string>("");
  const [loadMore, setLoadMore] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isScrolledDown, setIsScrolledDown] = useState<boolean>(true);
  const chatScrollRef= useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if(!message.trim()) return;
    socketConnection?.socket?.emit('message', { chatId:id, content:message });
    setMessage('')
  }

  const handleScroll = () => {
    if(chatScrollRef.current){
      const currentRef = chatScrollRef.current;
      requestAnimationFrame(() => {
        if(currentRef){
          const isAtBottom = currentRef.scrollHeight - currentRef.scrollTop <= currentRef.clientHeight + 5;
          setIsScrolledDown(isAtBottom);
        }
      });
      if(currentRef.scrollTop === 0){
        console.log("Scrolled to top");
        if(hasMore){
          setLoadMore(prev => prev + 1);
        }
      }
    }
  };

  useEffect(() => {
    if (!socketConnection?.socket || !id) return;
    console.log("Socket connected to", socketConnection?.socket.id);
    socketConnection?.socket.emit("join-room", { id });
    
    socketConnection?.socket.on("connect", () => {
      console.log("Socket connected", socketConnection?.socket.id);
    });
    
    socketConnection?.socket.on("receive-message", (message:Message) => {
      setMessages((prev) => [...prev || [], message]);
    });

    socketConnection.socket.on("update-message-id", ({ tempMessage, realMessage }) => {
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
    });

    socketConnection?.socket.on("message-received", (message:Message) => {
      setMessages((prev) => (prev || []).map((msg) => msg.id === message.id ? message : msg));
    });

    socketConnection?.socket.on("message-read", (message:Message) => {
      setMessages((prev) => (prev || []).map((msg) => msg.id === message.id ? message : msg));
    });

    return () => {
      socketConnection?.socket.emit("leave-room", { id });
      socketConnection?.socket.off("connect");
      socketConnection?.socket.off("receive-message");
      socketConnection?.socket.off("update-message-id");
      socketConnection?.socket.off("message-received");
      socketConnection?.socket.off("message-read");
    };
  }, [socketConnection?.socket, id, chat])

  const getChat = async () => {
    const res = await axios.get(`/api/get-chat/${id}`);
    if(!res?.data){
      return
    }
    setChat(res?.data.data);
    const messages = await axios.get(`/api/get-messages/${id}`);
    if(!messages?.data){
      return
    }
    setMessages(messages?.data.data.reverse());
    setCursor(messages?.data.nextCursor);
    setHasMore(messages?.data.hasMore);
  }

  useEffect(() => {
    if(chatScrollRef.current && messages && isScrolledDown && !isUpdating){
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior: 'smooth'  
        });
      }, 100);
      setIsScrolledDown(true);
    }
  }, [messages]);

  useEffect(() => {
    if(chatScrollRef.current){
      console.log("Adding event listener");
      chatScrollRef.current.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (chatScrollRef.current) {
        chatScrollRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [chat]);

  useEffect(() => {
    console.log("Page changed", cursor);
    const getMessages = async (cursor:string) => {
      if(!hasMore) return;
      setLoadingMessages(true);
      const res = await axios.get(`/api/get-messages/${id}?cursor=${cursor}`);
      if(!res?.data){
        return
      }
      setMessages((prev) => [...res?.data.data.reverse(), ...prev || []]);
      setCursor(res?.data.nextCursor);
      setHasMore(res?.data.hasMore);
      setLoadingMessages(false);
    }

    if(cursor && !loadingMessages){
      getMessages(cursor);
    }
  }, [loadMore]);

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
            loadingMessages && <div className="w-full flex justify-center items-center"><MessageLoader/></div>
          }
          {
            socketConnection && session?.user && messages?.map((message) => (
              <MessageComponent key={message.id} message={message} user={session?.user} socket={socketConnection?.socket}/>
            ))
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

