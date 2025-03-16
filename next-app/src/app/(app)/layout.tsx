"use client"
import { Geist, Geist_Mono } from "next/font/google";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useSession } from "next-auth/react";
import React, { createContext, useEffect, useState } from "react";
import { User } from "next-auth";
import { Message, User as UserDB } from "@prisma/client";
import { io, Socket } from "socket.io-client";
import { Chat, Notification } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import ChatComponent from "@/components/helpers/ChatComponent";
import NotificationDialog from "@/components/helpers/NotificationDialog";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Loader from "@/components/helpers/Loader";
import LogoutDialog from "@/components/helpers/LogoutDialog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export interface UserWithId extends User {
  id: string;
}

export interface ChatWithLastMessage extends Chat {
  messages: Message[];
  users: UserDB[];
}
export interface NotificationWithUser extends Notification {
  user: UserDB;
}

export const UserContext = createContext<{ user: UserWithId } | null>(null);
export const SocketContext = createContext<{ socket: Socket } | null>(null);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<UserWithId | null>(null);
  const {data:session, status} = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<ChatWithLastMessage[] | null>(null);
  const router = useRouter();
  const url = usePathname().split("/")
  const chatId = url.pop();
  const pathname = url.pop();
  const [unreadMessages, setUnreadMessages] = useState<{[key:string]: Message[]}>({});
  const [currentChat, setCurrentChat] = useState<ChatWithLastMessage | null>(null);
  const [currentOnlineUser, setCurrentOnlineUser] = useState<boolean>();
  const [currentUserTyping, setCurrentUserTyping] = useState<boolean>(false);

  const getId = async () => {
    if(!session?.user?.email) return;
    const res = await axios.get(`/api/get-id`, { params: { email: session?.user?.email } });
    setUser({ ...session?.user, id: res?.data?.data.id });
    return res;
  }


  const getChats = async () => {
    if(!user) return;
    await axios.get(`/api/get-chats/${user?.id}`)
    .then((res) => {
      setChats(res?.data?.data);
      setUnreadMessages(() => {
        const chats = res?.data?.data.reduce((acc: { [key: string]: Message[] }, chat: ChatWithLastMessage) => {
          acc[chat.id] = chat.messages?.filter((message) => {
            if(message.userId !== user?.id && !message.received && !message.read){
              socket?.emit("message-received", { messageId:message.id });
            }
            return message.userId !== user?.id && !message.read
          }) || [];
          return acc;
        }, {});
        return chats;
      });     

      res?.data?.data?.forEach((chat:ChatWithLastMessage) => {
        socket?.emit("join-room", { id: chat.id }); 
      })
    })
  }

  useEffect(() => {
    getId()
    .then((res) => {
         if(!res?.data?.data.id){
            return;
         }
         const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
          query: {
            userId: res?.data?.data.id
          }
         })
         if(socket.active){
            setSocket(socket)
         }
    })
  }, [status,setUser]);

  useEffect(() => {
    if(!socket) return;

    socket.on("receive-message-background", (message:Message) => {
      if(message.userId === user?.id) return;

      setUnreadMessages((prev) => {
        if(!prev[message.chatId]){
          return {
            ...prev,
            [message.chatId]: [message]
          }
        }
        return {
          ...prev,
          [message.chatId]: [...prev[message.chatId], message]
        }
      })
    })

    socket.on("update-message-id-background", ({ tempMessage, realMessage }) => {
      if(realMessage.userId === user?.id) return;

      setUnreadMessages((prev) => ({
        ...prev,
        [tempMessage.chatId]: prev[tempMessage.chatId].map(
          (message) => message.id === tempMessage.id ? realMessage : message
        )
      }));
      socket.emit("message-received", { messageId: realMessage.id });
    });
    

    return () => {
      socket?.off("receive-message-background");
      socket?.off("update-message-id-background");
    }
  }, [socket, chatId])

  useEffect(() => {
    if(user){
      getChats();
    }
  }, [user, chatId]);

  useEffect(() => {
    setCurrentChat(chats?.find((chat) => chat.id === chatId)|| null);
  },[chatId, url])

  useEffect(() => {
    if(socket && user && currentChat){
      const currentUser = currentChat.users.filter((u) => u.id !== user.id)[0].id
      socket.emit("join-room", { id: currentUser });

      socket.emit("online-status", { userId: currentUser, sendId: user.id });

      socket?.on("online-status",(userId:string, status) => {
        if(userId === currentUser){
          setCurrentOnlineUser(status);
        }
      })

      socket.on("typing", (userId:string, status:boolean) => {
        if(userId === currentUser){
          setCurrentUserTyping(status);
        }
      })
    }

    return () => {
      setCurrentOnlineUser(false);
      setCurrentUserTyping(false);
      socket?.emit("leave-room", { id: currentChat?.users.filter((u) => u.id !== user?.id)[0].id });
      socket?.off("online-status");
      socket?.off("typing");
    }
  },[currentChat, socket])


  if(!user || !socket || !chats){
    return <div className="w-full h-screen flex justify-center items-center"><Loader/></div>
  }

  return (
    <>
      { (user && socket && chats && unreadMessages) && (
        <div
         className={`${geistSans.variable} ${geistMono.variable} bg-zinc-950 antialiased flex flex-col h-screen overflow-hidden`}
         suppressHydrationWarning
        >
        <nav className="w-full border-t-[1px] flex justify-between items-center border-b-[1px] border-zinc-700">
            <div className={`2xl:w-[450px] xl:w-[350px] lg:w-[300px] lg:flex ${!chatId || chatId==="search"? "w-full flex" : "hidden"} justify-between items-center border-r-[1px] border-zinc-700 p-4 text-white`}>
              <div onClick={() => router.push("/")} className="cursor-pointer">
                Chat App
              </div>
              <div className="lg:hidden flex space-x-3">
                <Button 
                 onClick={() => router.push("/search")}
                 variant={"outline"}
                >
                  <Search/>
                </Button>
                {socket && user && <NotificationDialog user={user} socket={socket} getChats={getChats}></NotificationDialog>}
                <LogoutDialog/>
              </div>
            </div>
            <div className={`h-full lg:flex lg:w-auto ${pathname === "chat"? "w-full flex" : "hidden"} flex-1 justify-between items-center text-white`}>
              <div className="h-full">
               {
                  currentChat && (
                  <div className="py-2 px-3 flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={currentChat.users.filter((u) => u.id !== user?.id)[0].avatar}/>
                      <AvatarFallback>
                        {currentChat.users.filter((u) => u.id !== user?.id)[0].name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col justify-center">
                        <div>
                            {currentChat.users.filter((u) => u.id !== user?.id)[0].name}
                        </div>
                        <div className="text-xs text-blue-500">
                          {currentUserTyping? "Typing..." : currentOnlineUser ? "Online" : "Offline"}
                        </div>
                    </div>
                  </div>
                  )
               }
              </div>
              <div className="h-full flex justify-end items-center space-x-3 px-3 py-1 border-l-[1px] border-zinc-700">
                <Button 
                 onClick={() => router.push("/search")}
                 variant={"outline"}
                >
                  <Search/>
                </Button>
                {socket && user && <NotificationDialog user={user} socket={socket} getChats={getChats}></NotificationDialog>}
                <LogoutDialog/>
              </div>
            </div>
        </nav>
        <main className="relative flex flex-1 h-full text-black overflow-hidden">
          <div className={`bg-zinc-950 2xl:w-[450px] xl:w-[350px] lg:w-[300px] ${!chatId? "w-full" : "hidden"} lg:flex flex-col justify-start border-r-[1px] border-zinc-700 overflow-auto`}>
             {
                user && unreadMessages && chats?.map((chat) => (
                  <ChatComponent key={chat.id} chat={chat} user={user} pathname={chatId as string} unreadMessages={unreadMessages}/>
                ))
             }
          </div>
          <div className={`flex-1 h-full lg:block ${chatId? "w-full" : "hidden"}`}>
          {
            (user && socket) ? (
              <UserContext.Provider value={{ user }}>
                <SocketContext.Provider value={{ socket }}>
                {children}
                </SocketContext.Provider>
              </UserContext.Provider>
            ) : (
              <div className="text-white animate-spin m-auto h-10 w-10 rounded-full border-t-[3px] border-white"></div>
            )
          }
          </div>
        </main>
        <Toaster/>
      </div>
    )}
  </>
  );  
}

