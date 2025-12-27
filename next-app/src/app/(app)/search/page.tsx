"use client"
import { Input } from '@/components/ui/input'
import { Chat, Notification, User } from '@prisma/client'
import axios, { AxiosResponse } from 'axios'
import React, { useContext, useEffect, useState } from 'react'
import { toast } from "sonner"
import SearchComponent from '@/components/helpers/SearchComponent'
import { getSocket } from '@/lib/socket'
export interface UpdatedUser extends User {
    targetNotifications: Notification[];
    chats: Chat[]
}

const Page = () => {
    const [query, setQuery] = useState<string>('')
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [searchResults, setSearchResults] = useState<UpdatedUser[]>([])
    const [isSearching, setIsSearching] = useState<boolean>(false)
    const [loading, setLoading] = useState<string>("")
    const socket = getSocket()

    const handleAdd = async (e: React.MouseEvent<HTMLButtonElement>) => {
        const targetId = e.currentTarget?.getAttribute('data-id');
        if(!targetId) return;
        setLoading(targetId)
        try {
            const res:AxiosResponse = await axios.post(`/api/notification`, { targetId, type: "Request" })
            if(res?.status < 300){
                const updatedUser = searchResults.map((user) => {
                    if(user.id === targetId){
                        return {
                            ...user,
                            targetNotifications: [...user.targetNotifications, { ...res?.data.data, user:undefined }]
                        }
                    }
                    return user
                })
                setSearchResults(updatedUser)
                setLoading("")
                toast.success(res.data.message)
                if(res.data.data.reverseNotification){
                    socket.emit('notification-update', { notification: res?.data.data.reverseNotification })
                    socket.emit('notification', { notification: res?.data.data.notification })
                }
                socket.emit('notification', { notification: res?.data.data })
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

    useEffect(() => {
        const timer = setTimeout(() => {
            if(query.trim()){
                setDebouncedQuery(query);
            }else{
                setSearchResults([])
            }
        }, 200);

        return () => clearTimeout(timer);
    },[query]);

    useEffect(() => {
        const handleSearch = async (query:string) => {
            const res = await axios.get(`/api/search-user`, { params: { query } })
            setSearchResults(res?.data.data)
            setIsSearching(false)
        }

        if(debouncedQuery){
          handleSearch(debouncedQuery)
        }else{
          setIsSearching(false)
          setSearchResults([])
        }
    },[debouncedQuery]);

  return (
    <div className='h-full flex flex-col items-center p-5 w-full'>
       <h1 className='text-3xl font-bold text-white'>Search</h1>
       <div className='flex space-x-3 items-center mt-5'>
        <Input 
         value={query} 
         onChange={(e) =>{ 
            setQuery(e.target.value)
            setIsSearching(true)
        }}
         className='sm:w-[400px] xs:w-[300px] w-[200px] xs:text-base text-sm text-white border-zinc-600'
        />
       </div>

       <div className='w-full mt-5 flex flex-col space-y-6 items-center overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent'>
            {
                searchResults && searchResults.map((user) => (
                    <SearchComponent key={user.id} user={user} handleAdd={handleAdd} loading={loading}/>
                ))
            }
            {
                !isSearching && searchResults.length === 0 && query && <span className='text-white'>No results found</span>
            }
       </div>
    </div>
  )
}

export default Page
