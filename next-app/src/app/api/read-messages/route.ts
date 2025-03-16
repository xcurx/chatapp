import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const PATCH = async (req:Request) => {
    const { messageId } = await req.json()
    const session = await auth();

    if(!session?.user){
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

    if(sender?.email === session.user?.email){
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
}