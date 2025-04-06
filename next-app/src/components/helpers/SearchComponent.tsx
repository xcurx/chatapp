"use client"
import { Button } from '@/components/ui/button'
import React from 'react'
import { UpdatedUser } from '@/app/(app)/search/page'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Check, Loader, Plus } from 'lucide-react'

const SearchComponent = ({
    user,
    handleAdd,
    loading
}:{
    user:UpdatedUser
    handleAdd: (e: React.MouseEvent<HTMLButtonElement>) => void,
    loading: string
}) => {
  return (
    <div key={user.id} className='flex items-center justify-between p-3 space-x-3 mt-3 xs:w-[400px] w-[300px] bg-zinc-900 border-2 border-zinc-700 rounded-md'>
       <div className='flex-1 flex items-center space-x-3 min-w-0'>
            <div className='w-10 h-10 rounded-full bg-gray-800'>
                <Avatar>
                    <AvatarImage src={user.avatar}/>
                    <AvatarFallback>
                        {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className='flex flex-col w-full min-w-0'>
                <span className='text-white break-words whitespace-normal w-full'>{user.name}</span>
                <span className='text-gray-400 break-words whitespace-normal w-full'>{user.email}</span>
            </div>
       </div>
       <div>
            <Button 
             disabled={user.targetNotifications.length > 0 || user.chats.length > 0} 
             onClick={handleAdd} data-id={user.id} 
             size={"icon"}
            >
                {
                    loading===user.id && user.targetNotifications.length === 0?
                    <Loader/>:
                    !(user.targetNotifications.length > 0 || user.chats.length > 0)? 
                    <Plus/> :
                    <Check/>
                }
            </Button>
       </div>
    </div>
  )
}

export default SearchComponent
