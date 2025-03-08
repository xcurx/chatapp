"use client"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Chat, Notification, User } from '@prisma/client'
import axios from 'axios'
import { Check, Loader, Plus } from 'lucide-react'
import Image from 'next/image'
import React, { useContext, useState } from 'react'
import { SocketContext } from '../layout'
import { toast } from "sonner"

interface UpdatedUser extends User {
    targetNotifications: Notification[];
    chats: Chat[]
}

const Page = () => {
    const [query, setQuery] = useState<string>('')
    const [searchResults, setSearchResults] = useState<UpdatedUser[]>([])
    const [loading, setLoading] = useState<string>("")
    const socketConnection = useContext(SocketContext)

    const handleSearch = async () => {
        const res = await axios.get(`/api/search-user`, { params: { query } })
        setSearchResults(res?.data.data)
    }

    const handleAdd = async (e: React.MouseEvent<HTMLButtonElement>) => {
        const targetId = e.currentTarget?.getAttribute('data-id');
        if(!targetId) return;
        setLoading(targetId)
        try {
            const res = await axios.post(`/api/notification`, { targetId, type: "Request" })
            if(res?.data.data){
                const updatedUser = searchResults.map((user) => {
                    if(user.id === targetId){
                        return {
                            ...user,
                            targetNotifications: [...user.targetNotifications, res?.data.data]
                        }
                    }
                    return user
                })
                setSearchResults(updatedUser)
                setLoading("")
                toast.success("Request sent")
                socketConnection?.socket.emit('notification', { targetId, notification: res?.data.data })
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data.message)
            } else {
                console.error(error)
            }
            setLoading("")
        }
    } 

  return (
    <div className='h-full flex flex-col items-center p-5 w-full'>
       <h1 className='text-3xl font-bold text-white'>Search</h1>
       <div className='flex space-x-3 items-center mt-5'>
        <Input 
         value={query} 
         onChange={(e) => setQuery(e.target.value)}
         className='w-[400px] text-white'
        />
        <Button onClick={handleSearch}>Search</Button>
       </div>

       <div className='w-full mt-5 flex flex-col space-y-6 items-center'>
            {
                searchResults && searchResults.map((user) => (
                    <div key={user.id} className='flex items-center justify-between space-x-3 mt-3 w-[400px] bg-gray-700 p-2 rounded-md'>
                       <div className='flex items-center space-x-3'>
                            <div className='w-10 h-10 rounded-full bg-gray-800'>
                                 <Image src={user.avatar} width={40} height={40} alt='avatar' className='w-full rounded-full'/>
                            </div>
                            <div className='flex flex-col'>
                                <span className='text-white'>{user.name}</span>
                                <span className='text-gray-400'>{user.email}</span>
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
                                    <Loader/> :
                                    !(user.targetNotifications.length > 0 || user.chats.length > 0)? 
                                    <Plus/> :
                                    <Check/>
                                }
                            </Button>
                       </div>
                    </div>
                ))
            }
       </div>
    </div>
  )
}

export default Page
