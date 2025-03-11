import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const PATCH = auth(async (req) => {
    const { messageId } = await req.json()

    if(!req?.auth?.user){
        return Response.json(
            {
                success: false,
                message: 'Unauthorized access'
            },
            { status: 401 }
        )    
    }

    if(!messageId) {
        return Response.json(
            {
                success: false,
                message: 'Messages not provided'
            },
            { status: 400 }
        )
    }

    const messagesExists = await prisma.message.findUnique({
        where:{
            id: messageId
        }
    })
    if(!messagesExists){
        return Response.json(
            {
                success: false,
                message: 'Message not found'
            },
            { status: 404 }
        )
    }

    const sender = await prisma.user.findUnique({
        where:{
            id: messagesExists?.userId
        }
    })
    console.log(sender?.email, req?.auth?.user?.email);

    if(sender?.email === req?.auth?.user?.email){
        return Response.json(
            {
                success: false,
                message: 'Sender cannot read messages'
            },
            { status: 401 }
        )
    }


    await prisma.message.update({
        where:{
            id: messageId
        },
        data:{
            read: true
        }
    })

    return Response.json(
        {
            success: true,
            message: 'Messages updated'
        },
        { status: 200 }
    )
}) 