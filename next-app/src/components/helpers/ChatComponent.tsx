import { ChatWithLastMessage, UserWithId } from '@/app/(app)/layout'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Message } from '@prisma/client'
import { useRouter } from 'next/navigation'

const ChatComponent = ({
    chat,
    pathname,
    user,
    unreadMessages
}:{
    chat:ChatWithLastMessage,
    pathname:string,
    user:UserWithId,
    unreadMessages:{[key:string]: Message[]}
}) => {
    const router = useRouter()

  return (
    <div 
     key={chat.id} 
     className={`p-3 text-white ${pathname===chat.id? "bg-zinc-800":"bg-zinc-950"} w-full flex space-x-3 border-b-[1px] border-zinc-700 cursor-pointer"`}
     onClick={() => router.push(`/chat/${chat.id}`)}
    >
      <div>
        <Avatar>
            <AvatarImage src={chat.users.filter((u) => u.name !== user?.name)[0].avatar}/>
            <AvatarFallback className="bg-zinc-700">
                {chat.name.split('-').filter((name) => name !== user?.name)[0][0]}
            </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1">
        <div className="xl:text-lg text-base">{chat.name.split('-').filter((name) => name !== user?.name)[0]}</div>
        <div className="w-full text-sm text-gray-200 text-ellipsis">
          {
            pathname!==chat.id ? (unreadMessages[chat.id] && unreadMessages[chat.id]?.length>0) ? (
             <div className="w-full flex justify-between">
                <span className="text-[#0071FF]"> 
                  {unreadMessages[chat.id]?.[unreadMessages[chat.id]?.length - 1]?.content}
                </span>
                <span className="text-white rounded-full w-5 h-5 flex justify-center items-center bg-blue-600 text-xs">
                  {unreadMessages[chat.id].length.toString()}
                </span>
             </div>
            ) : chat.messages[0]?.content ? chat.messages[0]?.content : "No messages" : null
          }
        </div>
      </div>
    </div>
  )
}

export default ChatComponent
