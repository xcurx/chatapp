import React, { useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Menu, MessageSquareText } from 'lucide-react'
import SearchSheet from './SearchSheet'
import { Socket } from 'socket.io-client'
import { UserWithId } from '@/app/(app)/layout'
import NotificationSheet from './NotificationSheet'
  

const DropdownMenuComponent = ({
    socket,
    user,
    getChats
}:{
    socket:Socket,
    user:UserWithId,
    getChats:() => void
}) => {
    const [open, setOpen] = useState(false)
    const [optionsOpen, setOptionsOpen] = useState(false)

  return (
    <DropdownMenu open={open || optionsOpen} onOpenChange={() => setOpen(!open)}>
      <DropdownMenuTrigger asChild>
        <Menu/>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-[250px] mr-2'>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
            <SearchSheet setOpenOption={setOptionsOpen}/>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOpen(true)}>
            <NotificationSheet setOpenOption={setOptionsOpen} socket={socket} user={user} getChats={getChats}/>
        </DropdownMenuItem>
        <DropdownMenuItem>
            <MessageSquareText/> Chats
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut/>  Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

  )
}

export default DropdownMenuComponent
