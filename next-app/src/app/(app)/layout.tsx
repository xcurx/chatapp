"use client"
import { Geist, Geist_Mono } from "next/font/google";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import React from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import ChatComponent from "@/components/helpers/ChatComponent";
import NotificationDialog from "@/components/helpers/NotificationDialog";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Loader from "@/components/helpers/Loader";
import LogoutDialog from "@/components/helpers/LogoutDialog";
import { getSocket } from "@/lib/socket";
import { useChats } from "@/hooks/useChats";
import { User } from "@prisma/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session } = useSession();
  const user: Partial<User> = {
      ...session?.user,
      avatar:session?.user.image as string,
  }
  const { chatId, chats, currentChat, currentOnlineUser, currentUserTyping, getChats, pathname } = useChats(user?.id!)
  const router = useRouter();
  let socket = getSocket()

  if (!user || !socket || !chats) {
    return <div className="w-full h-screen flex justify-center items-center"><Loader /></div>
  }

  return (
    <>
      {(user && socket && chats) && (
        <div
          className={`${geistSans.variable} ${geistMono.variable} bg-zinc-950 antialiased h-full flex flex-col overflow-hidden`}
          suppressHydrationWarning
        >
          <nav className="w-full border-t-[1px] flex justify-between items-center border-b-[1px] border-zinc-700">
            <div className={`2xl:w-[450px] xl:w-[350px] lg:w-[300px] lg:flex ${!chatId || chatId === "search" ? "w-full flex" : "hidden"} justify-between items-center border-r-[1px] border-zinc-700 p-4 text-white`}>
              <div onClick={() => router.push("/")} className="cursor-pointer">
                Chat App
              </div>
              <div className="lg:hidden flex space-x-3">
                <Button
                  onClick={() => router.push("/search")}
                  variant={"outline"}
                >
                  <Search />
                </Button>
                {socket && user && <NotificationDialog user={user} socket={socket} getChats={getChats}></NotificationDialog>}
                <LogoutDialog />
              </div>
            </div>
            <div className={`h-full lg:flex lg:w-auto ${pathname === "chat" ? "w-full flex" : "hidden"} flex-1 justify-between items-center text-white`}>
              <div className="h-full">
                {
                  currentChat && (
                    <div className="py-2 px-3 flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={currentChat.users.filter((u) => u.id !== user?.id)[0].avatar as string} />
                        <AvatarFallback>
                          {currentChat.users.filter((u) => u.id !== user?.id)[0].name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col justify-center">
                        <div>
                          {currentChat.users.filter((u) => u.id !== user?.id)[0].name}
                        </div>
                        <div className="text-xs text-blue-500">
                          {currentUserTyping ? "Typing..." : currentOnlineUser ? "Online" : "Offline"}
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
                  <Search />
                </Button>
                {socket && user && <NotificationDialog user={user} socket={socket} getChats={getChats}></NotificationDialog>}
                <LogoutDialog />
              </div>
            </div>
          </nav>
          <main className="relative flex flex-1 h-full text-black overflow-hidden">
            <div className={`bg-zinc-950 2xl:w-[450px] xl:w-[350px] lg:w-[300px] ${!chatId ? "w-full" : "hidden"} lg:flex flex-col justify-start border-r-[1px] border-zinc-700 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent`}>
              {
                chats?.length === 0 && (
                  <div className="flex-1 flex flex-col justify-center items-center p-2 text-zinc-300">
                    <div className="text-lg">No Chats</div>
                    <div className="text-lg text-center">Search users to send them message request</div>
                  </div>
                )
              }
              {
                user && chats?.map((chat) => (
                  <ChatComponent key={chat.id} chat={chat} user={user} pathname={chatId as string}/>
                ))
              }
            </div>
            <div className={`flex-1 h-full lg:block ${chatId ? "w-full" : "hidden"}`}>
              {
                (user && socket) ? (
                  children
                ) : (
                  <div className="text-white animate-spin m-auto h-10 w-10 rounded-full border-t-[3px] border-white"></div>
                )
              }
            </div>
          </main>
          <Toaster />
        </div>
      )}
    </>
  );
}

