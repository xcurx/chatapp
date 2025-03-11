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
import { Bell, Check, Loader, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

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

interface ChatWithLastMessage extends Chat {
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
  const pathname = usePathname().split("/").pop();
  const [unreadMessages, setUnreadMessages] = useState<{[key:string]: Message[]}>({});

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
      console.log("chats",res?.data?.data);
      setChats(res?.data?.data);
      setUnreadMessages(() => {
        const chats = res?.data?.data.reduce((acc: { [key: string]: Message[] }, chat: ChatWithLastMessage) => {
          acc[chat.id] = chat.messages?.filter((message) => {
            if(message.userId !== user?.id && !message.read){
              socket?.emit("change-receive-status", { message });
            }
            return message.userId !== user?.id && !message.read
          }) || [];
          return acc;
        }, {});
        return chats;
      });      
    })
  }

  if(chats){
    console.log("path",pathname,chats[0]?.id);
  }

  useEffect(() => {
    getId()
    .then((res) => {
         if(!res?.data?.data.id){
            return;
         }
         setSocket(io('http://localhost:8000', {
          query: {
            userId: res?.data?.data.id
          }
        }))
    })
  }, [status,setUser]);

  useEffect(() => {
    if(socket){
      socket.on("connect", () => {
        socket.on("background-message", (message:Message, type:string, fakeMesg:Message) => {
          console.log("Received message in background", message.content);
          if(type === "real" && fakeMesg){
            socket.emit("change-receive-status", { message });
            setUnreadMessages((prev) => {
              return {
                ...prev,
                [message.chatId]: prev[message.chatId].map((mesg) => mesg.id === fakeMesg.id ? message : mesg)
              }
            })
            return;
          }

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
      })
    }

    return () => {
      socket?.off("connect");
      socket?.off("background-message");
    }
  }, [socket])

  useEffect(() => {
    if(user){
      getChats();
    }
  }, [user]);

  return  (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col h-screen overflow-hidden`}
        >
        <nav className="w-full">
          <div className="w-full bg-gray-800 text-white p-3 flex justify-end space-x-3">
             {/* <Button onClick={create}>Create Chat</Button> */}
             <Button onClick={() => router.push("/search")}>Add User</Button>
             <Button onClick={() => router.push("/profile")}>
                  Profile
             </Button>
             {user && <NotificationDialog user={user}></NotificationDialog>}
          </div>
        </nav>
        <main className="flex flex-1 h-full text-black overflow-hidden">
          <div className="bg-gray-700 w-1/4 flex flex-col justify-start overflow-auto">
             {
                unreadMessages && chats?.map((chat) => (
                  <div 
                   key={chat.id} 
                   className={`p-3 text-white ${pathname===chat.id? "bg-gray-600":"bg-gray-500"} flex space-x-3 border-b-2 border-gray-400 cursor-pointer"`}
                   onClick={() => router.push(`/chat/${chat.id}`)}
                  >
                    <div>
                      <Avatar>
                          <AvatarImage src={chat.users.filter((u) => u.name !== user?.name)[0].avatar}/>
                          <AvatarFallback>
                              {chat.name.split('-').filter((name) => name !== user?.name)[0][0]}
                          </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <div className="text-lg">{chat.name.split('-').filter((name) => name !== user?.name)[0]}</div>
                      <div className="w-full text-sm text-gray-200 text-ellipsis">
                        {
                          pathname!==chat.id ? unreadMessages[chat.id]?.length>0 ? (
                           <div className="w-full flex justify-between">
                              <span className="text-green-500"> 
                                {unreadMessages[chat.id][0].content}
                              </span>
                              <span className="text-white rounded-full bg-green-500 text-xs">
                                {unreadMessages[chat.id].length.toString()}
                              </span>
                           </div>
                          ) : chat.messages[0]?.content ? chat.messages[0]?.content : "No messages" : null
                        }
                      </div>
                    </div>
                  </div>
                ))
             }
          </div>
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
        </main>

        <Toaster/>
      </body>
    </html>
  );
}

const NotificationDialog = ({ user }:{ user:UserWithId }) => {
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([]);
  const [loading, setLoading] = useState<string>("");

  const geiNotifications = async () => {
    const res = await axios.get(`/api/get-notifications/${user.id}`)
    // console.log(res?.data?.data)
    setNotifications(res?.data?.data)
  }

  const handleRead = async (e:React.MouseEvent<HTMLButtonElement>) => {
    const notificationId = e.currentTarget?.getAttribute('data-notificationid');
    if(!notificationId) return;
    setLoading(notificationId);
    const res = await axios.patch(`/api/notification-action`, { notificationId });
    if(res?.data?.message){
      geiNotifications()
      .then(() => setLoading(""))
      toast.success("Request rejected");
    }
  }

  const handleAccept = async (e:React.MouseEvent<HTMLButtonElement>) => {
    const userId = e.currentTarget?.getAttribute('data-userid');
    const notificationId = e.currentTarget?.getAttribute('data-notificationid') as string
    if(!userId) return;
    setLoading(notificationId);
    const res = await axios.post(`/api/create-chat`, { user1: user.id, user2: userId });
    // console.log(res?.data?.data)
    if(res?.data?.data){
      const res = await axios.patch(`/api/notification-action`, { notificationId });
      if(res?.data?.message){
        axios.post(`/api/notification`, { targetId: userId, type: "Accept" });
        geiNotifications()
        .then(() => setLoading(""))
        toast.success("Chat created");
      }
    }
  }

  useEffect(() => {
    geiNotifications()
  },[])

  return (
    <Dialog>
      <DialogTrigger className="cursor-pointer bg-white py-1 px-3 rounded-lg">
        <Bell className="text-black"/>
      </DialogTrigger>
      <DialogContent className="flex flex-col items-center">
        <DialogHeader className="flex flex-col items-center">
          <DialogTitle className="text-2xl">Notifications</DialogTitle>
          <div className="mt-3">
            {
              notifications?.map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between space-x-3 my-4 border-2 rounded-md p-3">
                    <div className="flex items-center space-x-3">
                       <div>
                          <Avatar className="flex justify-center items-center bg-gray-600">
                            <AvatarImage src={notification.user.avatar}/>
                            <AvatarFallback className="flex items-center justify-center">{notification.user.name[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span>{notification.user.name}</span>
                          <span>{notification.content}</span>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                      {
                        loading===notification.id && !notification.read ? (
                          <Loader/>
                        ) : (!notification.read && notification.type !== "Accept") && (
                          <>
                            <Button onClick={handleAccept} data-userid={notification.user.id} data-notificationid={notification.id}>
                              <Check/>
                            </Button>
                            <Button onClick={handleRead} data-notificationid={notification.id}>
                              <X/>
                            </Button>
                          </>
                        )
                      }
                    </div>
                  </div>
              ))
            }
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}