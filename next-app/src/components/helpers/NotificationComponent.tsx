import { NotificationWithUser } from "@/app/(app)/layout"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Check, Loader, X } from "lucide-react"
import { Button } from "../ui/button"
import { useEffect, useRef } from "react"
import axios from "axios"

const NotificationComponent = ({ 
    notification, 
    handleAccept, 
    handleRead,
    loading,
    setNotifications
  }:{ 
    notification:NotificationWithUser, 
    handleAccept: (e: React.MouseEvent<HTMLButtonElement>) => void, 
    handleRead: (e: React.MouseEvent<HTMLButtonElement>) => void,
    loading: string,
    setNotifications: React.Dispatch<React.SetStateAction<NotificationWithUser[]>>
  }) => {
    const notificationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        async ([entry]) => {
          if(entry.isIntersecting && !notification.read){
            await axios.patch(`/api/notification-read`, { notificationId: notification.id });
            setNotifications((prev) => prev.map((n) => n.id === notification.id ? {...n, read: true} : n))
          }
        },
        { threshold: 0.5 } 
      )

      if(notificationRef.current && !notification.read){
        observer.observe(notificationRef.current);
      }

      return () => {
        if(notificationRef.current){
          observer.unobserve(notificationRef.current);
        }
      }
    },[notification])



    return (
      <div ref={notificationRef} className="flex items-center justify-between space-x-3 my-4 border-2 rounded-md p-3">
      <div className="flex items-center space-x-3">
         <div>
          <Avatar className="flex justify-center items-center bg-gray-600"> 
            <AvatarImage src={notification.user.avatar} className="xs:w-8"/>
            <AvatarFallback className="flex items-center justify-center">{notification.user.name[0]}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-col space-y-1 items-start text-left">
          <div className="">{notification.user.name}</div>
          <div className="">{notification.content}</div>
        </div>
      </div>
      <div className="flex space-x-2">
        {
        loading===notification.id ? (
          <Loader/>
        ) : (!notification.accepted && notification.type === "Request") && (
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
    )
  }

export default NotificationComponent