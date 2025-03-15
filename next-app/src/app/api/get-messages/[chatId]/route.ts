import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = auth(async (req) => {
    const url = new URL(req.url);
    const chatId = url.pathname.split('/').pop();
 
    if(!req.auth?.user){
        Response.json(
            {
                success: false,
                message: 'Unauthorized',
            },
            { status: 500 }
        )
    }

    if(!chatId){
        return Response.json(
            {
                success: false,
                message: 'Chat Id not found',
            },
            { status: 500 }
        )
    }

    const chat = await prisma.chat.findUnique({
        where: {
            id: chatId
        },
        include: {
            messages: {
                orderBy: {
                    createdAt: 'desc'    
                }
            },
            users: true
        }
    })
    if(!chat){
        return Response.json(
            {
                success: false,
                message: 'Chat not found',
            },
            { status: 500 }
        )
    }

    const cursor = url.searchParams.get('cursor') as string;
    const take = 20;

    const messages = await prisma.message.findMany({
            where:{
                chatId: chatId
            },
            take: take+1, // Fetch messages in descending order
            orderBy: { createdAt: "desc" },
            cursor: cursor ? { id: cursor } : undefined, // Use cursor if available
            skip: cursor ? 1 : 0, // Skip the cursor itself to prevent duplication
            include: {
                user: true
            }
    })


    const hasMore = messages.length > take; // If we got more than `take`, there are more messages
    if (hasMore) messages.pop(); // Remove the extra message
    const nextCursor = messages.length ? messages[messages.length - 1].id : null;

    for(let i = 0; i < messages.length; i++){
        const message = messages[i];

        if(chat.users.find((u) => u.email === req.auth?.user?.email)?.id === message.userId){
            continue;
        }
        if(message.received){
            continue;
        }
        await prisma.message.update({
            where: {
                id: message.id
            },
            data: {
                received: true
            }
        })
        messages[i].received = true;
    }

    return Response.json(
        {
            success: true,
            message: 'Chats fetched successfully',
            data: messages,
            hasMore,
            nextCursor
        },
        { status: 200 }
    )
})