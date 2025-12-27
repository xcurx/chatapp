import axios from "axios";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "../ui/dialog";
import { Bell, BellDot } from "lucide-react";
import { DialogTitle } from "@radix-ui/react-dialog";
import NotificationComponent from "./NotificationComponent";
import { Button } from "../ui/button";
import { NotificationWithUser } from "@/hooks/useChats";
import { User } from "next-auth";

const NotificationDialog = ({ 
  user, 
  socket, 
  getChats 
}:{ 
  user:User, 
  socket:Socket, 
  getChats:() => void 
}) => {
    const [notifications, setNotifications] = useState<NotificationWithUser[]>([]);
    const [hasUnread, setHasUnread] = useState<boolean>(false);
    const [loading, setLoading] = useState<string>("");
  
    const getNotifications = async () => {
      const res = await axios.get(`/api/get-notifications/${user.id}`)
      setNotifications(res?.data?.data.reverse())
    }
  
    const handleRead = async (e:React.MouseEvent<HTMLButtonElement>) => {
      const notificationId = e.currentTarget?.getAttribute('data-notificationid');
      if(!notificationId) return;
      setLoading(notificationId);
      getNotifications()
      .then(() => setLoading(""))
      toast.success("Request rejected");
    }
  
    const handleAccept = async (e:React.MouseEvent<HTMLButtonElement>) => {
      const userId = e.currentTarget?.getAttribute('data-userid');
      const notificationId = e.currentTarget?.getAttribute('data-notificationid') as string
      if(!userId) return;
      setLoading(notificationId);
      const res = await axios.patch(`/api/notification-action`, { notificationId, action: true });
      if(res?.data?.data){
        socket.emit('notification', { notification: res?.data.data })
        getNotifications()
        .then(() => setLoading(""))
        getChats();
        toast.success("Chat created");
      }
    }
  
    useEffect(() => {
      socket.on("notification", (notification:NotificationWithUser) => {
        if(notification.type === "Accept"){
          getChats();
        }
        setNotifications((prev) => {
          return [...prev, notification]
        })
      })

      socket.on("notification-update", (notification:NotificationWithUser) => {
        if(notification.type === "Accept"){
          getChats();
        }
        setNotifications((prev) => {
          return prev.map((prevNotification) => {
            if(prevNotification.id === notification.id){
              return notification
            }
            return prevNotification
          })
        })
      })
  
      return () => {
        socket?.off("notification");
      }
    }, [socket])
  
    useEffect(() => {
      setHasUnread(notifications.some((notification) => !notification.read))
    },[notifications])
  
    useEffect(() => {
      getNotifications()
    },[])
  
    return (
      <Dialog>
        <DialogTrigger asChild className="cursor-pointer bg-white rounded-lg">
          {
            <Button variant={"outline"} className="bg-zinc-950">
              {
                hasUnread ? (
                  <BellDot size={15} className="text-white"/>
                ) : (
                  <Bell size={15} className="text-white"/>
                )
              }
            </Button>
          }
        </DialogTrigger>
        <DialogContent className="flex flex-col items-center sm:w-[500px] xs:w-[400px] w-[300px] sm:text-base xs:text-sm text-xs">
          <DialogHeader className="flex flex-col items-center">
            <DialogTitle className="text-2xl">Notifications</DialogTitle>
            <div className="mt-3">
              {
                notifications?.map((notification) => (
                  <NotificationComponent 
                    key={notification.id} 
                    notification={notification} 
                    handleAccept={handleAccept} 
                    handleRead={handleRead}
                    loading={loading}
                    setNotifications={setNotifications}
                  />
                ))
              }
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  export default NotificationDialog