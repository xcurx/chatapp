import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = auth(async (req, ctx) => {
    const params = await ctx.params;
    const chatId = params?.chatId;
 
    if(!req.auth?.user){
        return Response.json(
            {
                success: false,
                message: 'Unauthorized',
            },
            { status: 401 }
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
            id: chatId as string
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