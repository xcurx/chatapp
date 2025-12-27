import { getSocket } from "@/lib/socket";
import { Chat, Message, Notification, User } from "@prisma/client";
import axios from "axios";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react"

export interface ChatWithLastMessage extends Chat {
  messages: Message[];
  users: User[];
  unreadCount: number
}

export interface NotificationWithUser extends Notification {
  user: User;
}

export const useChats = (userId:string) => {
    const [chats, setChats] = useState<ChatWithLastMessage[]>([]);
    const [currentChat, setCurrentChat] = useState<ChatWithLastMessage | null>(null);
    const [currentOnlineUser, setCurrentOnlineUser] = useState<boolean>();
    const [currentUserTyping, setCurrentUserTyping] = useState<boolean>(false);
    const url = usePathname().split("/")
    const chatId = url.pop()
    const pathname = url.pop()
    let socket = getSocket()

    const getChats = async () => {
      if (!userId) return;
      await axios.get(`/api/get-chats`)
        .then((res) => {
          setChats(res?.data?.data.chats);
          res?.data?.data.chats.forEach((chat: ChatWithLastMessage) => {
            socket?.emit("join-room", { id: chat.id });
          })
          res.data?.data.receivedMessageIds.map((m:string) => {
            socket.emit("message-received", ({id:m}))
          })
        })
    }

    useEffect(() => {
      if(!socket) return;

      socket.on("receive-message-background", ({message}) => {
        if(message.userId === userId) return;
        setChats((prev) => {
            return prev.map(chat => {
                if (chat.id === message.chatId) {
                    return {
                        ...chat,
                        messages: [message],
                        unreadCount: chat.unreadCount++
                    }
                }
                return chat
            })
        })
        
      })

      socket.on("update-message-id-background", ({ tempMessage, realMessage }) => {
        if(realMessage.userId === userId) return;
        setChats((prev) => {
            return prev.map(chat => {
                if (chat.id === tempMessage.chatId) {
                    return {
                        ...chat,
                        messages: [realMessage]
                    }
                }
                return chat
            })
        })
        
        socket?.emit("message-received", { id: realMessage.id });
      });


      return () => {
        socket?.off("receive-message-background");
        socket?.off("update-message-id-background");
      }
    }, [socket, chatId])

    useEffect(() => {
      if (userId) {
        getChats();
      }
    }, [userId, chatId]);

    useEffect(() => {
      setCurrentChat(chats?.find((chat) => chat.id === chatId) || null);
    }, [chatId, url])

    useEffect(() => {
      if (socket && userId && currentChat) {
        const currentUser = currentChat.users.filter((u) => u.id !== userId)[0].id
        socket.emit("join-room", { id: currentUser! });

        socket.emit("online-status", { userId: currentUser!, sendId: userId });

        socket?.on("online-status",({userId, status}) => {
          if(userId === currentUser){
            setCurrentOnlineUser(status);
          }
        })

        socket.on("typing", ({userId, status}) => {
          if(userId === currentUser){
            setCurrentUserTyping(status);
          }
        })
      }

      return () => {
        setCurrentOnlineUser(false);
        setCurrentUserTyping(false);
        socket?.emit("leave-room", { id: currentChat?.users.filter((u) => u.id !== userId)[0].id! });
        socket?.off("online-status");
        socket?.off("typing");
      }
    }, [currentChat, socket])

    return {
        chatId,
        pathname,
        chats,
        currentChat,
        currentOnlineUser,
        currentUserTyping,
        getChats
    }
}