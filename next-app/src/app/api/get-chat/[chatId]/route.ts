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

    return Response.json(
        {
            success: true,
            message: 'Chats fetched successfully',
            data: chat
        },
        { status: 200 }
    )
})