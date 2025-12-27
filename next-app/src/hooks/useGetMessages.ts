import { connectSocket, getSocket } from "@/lib/socket";
import { Message } from "@prisma/client";
import axios from "axios";
import { ParamValue } from "next/dist/server/request/params";
import { RefObject, useEffect, useState } from "react";

const getMessages = async (chatId:ParamValue, cursor:string | undefined=undefined, isForward=false, limit=50) => {
    const res = await axios.post(`/api/get-messages/${chatId}`, { cursor, isForward, limit });
    if(res?.data){
        return {
            messages: res?.data.data,
            nextCursor: res?.data.nextCursor,
            hasMore: res?.data.hasMore
        }
    }
}

const useGetMessages = (userId:string, chatId:ParamValue, limit:number, chatElementRef:RefObject<HTMLDivElement | null>) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState({ upward: false, downward: false });
    const [upperCursor, setUpperCursor] = useState<string | undefined>(undefined);
    const [lowerCursor, setLowerCursor] = useState<string | undefined>(undefined);
    const [latestMessageCursor, setLatestMessageCursor] = useState<string | undefined>(undefined);
    const [hasMoreLower, setHasMoreLower] = useState(false);
    const [hasMoreUpper, setHasMoreUpper] = useState(false);
    const [isScrolledDown, setIsScrolledDown] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const socket = getSocket()

    const getMessagesForward = async () => {
        if(loadingMessages.upward || loadingMessages.downward || isUpdating) return;
        if(!hasMoreLower) return;
        setLoadingMessages(prev => ({ ...prev, downward: true }));
        const res = await getMessages(chatId, lowerCursor, true, limit)
        if(res){
            setMessages((prev) => {
                const newMessages = [...prev, ...res.messages];
                if(newMessages.length > limit){
                    setHasMoreUpper(true);
                    setUpperCursor(newMessages[newMessages.length - limit].id);
                    return newMessages.slice(newMessages.length - limit);
                }
                return newMessages;
            });
            setLowerCursor(res.nextCursor);
            setHasMoreLower(res.hasMore);
        }
        setLoadingMessages(prev => ({ ...prev, downward: false }));
    }

    const getMessagesBackward = async () => {
        if(loadingMessages.downward || loadingMessages.upward || isUpdating) return;
        if(!hasMoreUpper) return;
        setLoadingMessages(prev => ({ ...prev, upward: true }));
        const res = await getMessages(chatId, upperCursor, false, limit);
        if(res){
            setMessages((prev) => {
                const newMessages = [...res.messages.reverse(), ...prev];
                if(newMessages.length > limit){
                    setHasMoreLower(true);
                    setLowerCursor(newMessages[limit - 1].id);
                    return newMessages.slice(0, limit);
                }
                return newMessages;
            });
            setUpperCursor(res.nextCursor);
            setHasMoreUpper(res.hasMore);
        }
        setLoadingMessages(prev => ({ ...prev, upward: false }));
        setTimeout(() => {
            const element = document.getElementById(`message-${lowerCursor}`);
            if (element && chatElementRef.current) {
                chatElementRef.current.scrollTop = element.offsetTop;
            }
        }, 10)
    }

    useEffect(() => {
        socket.emit("join-room", { id:chatId as string })

        socket.on("receive-message", async ({message}) => {
            console.log("receive-message", lowerCursor, latestMessageCursor, message);
            if(latestMessageCursor === lowerCursor){
              setMessages((prev) => [...prev || [], message]);
              setLowerCursor(message.id);
            }
            setLatestMessageCursor(message.id);
        })
    
        socket.on("update-message-id", ({ tempMessage, realMessage }) => {
          if(latestMessageCursor === lowerCursor){
            setIsUpdating(true);
            setMessages((prev) =>
                (prev || []).map(msg => msg.id === tempMessage.id ? realMessage : msg)
            );
            if(realMessage.userId !== userId){
              socket.emit("message-received", { id:realMessage.id });
            }
            setTimeout(() => {
              setIsUpdating(false);
            }, 500)
            setLowerCursor(realMessage.id);
          }
          setLatestMessageCursor(realMessage.id);
        });

        socket.on("message-received", ({message}) => {
            setMessages((prev) => (prev || []).map((msg) => msg.id === message.id ? message : msg));
        });

        socket.on("message-read", ({message}) => {
            setMessages((prev) => (prev || []).map((msg) => msg.id === message.id ? message : msg));  
        });

        return () => {
          socket.emit("leave-room", { id:chatId as string });
          socket.off("connect");
          socket.off("receive-message");
          socket.off("update-message-id");
          socket.off("message-received");
          socket.off("message-read");
        };
    }, [chatId, socket, latestMessageCursor, lowerCursor])

    useEffect(() => {
        const controller = new AbortController();
        chatElementRef.current?.addEventListener("scroll", async () => {
            if(!chatElementRef.current) return;
            if(chatElementRef.current?.scrollTop === 0 && hasMoreUpper && !isScrolledDown){
                setIsScrolledDown(false);
                await getMessagesBackward();
            }
            else if(chatElementRef.current?.scrollHeight - chatElementRef.current?.scrollTop === chatElementRef.current?.clientHeight && hasMoreLower){
                setIsScrolledDown(true);
                await getMessagesForward();
            }
            else {
                setIsScrolledDown(false);
            }
        }, { signal: controller.signal });

        return () => {
            controller.abort();
        }
    }, [getMessagesForward, getMessagesBackward, chatElementRef, hasMoreLower, hasMoreUpper])

    useEffect(() => {
        if(chatElementRef.current && latestMessageCursor == lowerCursor){
            setTimeout(() => {
                chatElementRef.current?.scrollTo({
                    top: chatElementRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }, [latestMessageCursor])

    useEffect(() => {
        const initialMessages = async () => {
            if(!chatId) return;
            setLoadingMessages({ upward:true, downward:true });
            const res = await getMessages(chatId);
            if(res){
                setMessages(res.messages.reverse());
                setUpperCursor(res.nextCursor);
                setHasMoreUpper(res.hasMore);
                if(res.messages.length > limit){
                    setMessages(res.messages.slice(res.messages.length - limit));
                }
                setLowerCursor(res.messages[res.messages.length - 1].id);
                setLatestMessageCursor(res.messages[res.messages.length - 1].id);
                setHasMoreLower(false);
            }
            setLoadingMessages({ upward:false, downward:false });
        }
        connectSocket("")
        initialMessages(); 
    }, [chatId]);

    return {
        messages,
        setMessages,
        setIsUpdating,
        setLatestMessageCursor,
        latestMessageCursor,
        setLowerCursor,
        upperCursor,
        lowerCursor,
        loadingMessages,
    }
}

export default useGetMessages;