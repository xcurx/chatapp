import { Message } from "@prisma/client";
import axios from "axios";
import { Check, CheckCheck } from "lucide-react";
import { User } from "next-auth";
import { usePathname, useSearchParams } from "next/navigation";
import { memo, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { isUUID } from "validator"

const MessageComponent = memo(({
    message, 
    user, 
    socket,
}:{
    message:Message, 
    user:User,
    socket:Socket,
}) => {
    const messageRef = useRef<HTMLDivElement>(null);
    const param = usePathname().split("/").pop()
      
    useEffect(() => {
        if (!messageRef.current || message.read || isUUID(message.id) || message.userId === user.id || message.chatId === param) return;

        const observer = new IntersectionObserver(
          async ([entry]) => {
            if (entry.isIntersecting) {
              console.log("Read by user", user.id)
              // await axios.patch(`/api/read-messages`, { messageId: message.id });
              socket.emit("message-read", { id:message.id });
              observer.disconnect(); // Stop observing after marking as read
            }
          },
          { threshold: 0.5 } // Trigger when 50% of the message is visible
        );
      
        observer.observe(messageRef.current);
      
        return () => observer.disconnect();
    },[message, messageRef])
  
  
    return (
      <div id={`message-${message.id}`} ref={messageRef} className={`flex m-3 ${message.userId === user.id? "justify-end" : "justify-start"}`}>
        <div className="relative p-2 bg-zinc-800 text-white rounded-lg">
          <div className="mr-5">
            {message.content}
          </div>
          {
            message.userId === user.id && (
              <div className="absolute -bottom-1 right-2">
                { message.received?  
                  message.read ? 
                  (<CheckCheck className="w-3 text-blue-500"/>) : 
                  (<CheckCheck className="w-3 text-zinc-400"/>) :
                  <Check className="w-3 text-zinc-400"/> 
                }
              </div>
            )
          }
        </div>
      </div>
    )
})

MessageComponent.displayName = "MessageComponent";
export default MessageComponent;
