import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = auth(async (req) => {
    const url = new URL(req.url);
    const chatId = url.pathname.split('/').pop();
 
    if(req.auth?.user){
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

    for(let i = 0; i < chat.messages.length; i++){
        const message = chat.messages[i];

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
    }

    return Response.json(
        {
            success: true,
            message: 'Chats fetched successfully',
            data: chat
        },
        { status: 200 }
    )
})