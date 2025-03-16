import { auth } from "@/lib/auth";
import { Message, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = auth(async (req) => {
    if(!req.auth?.user){
        Response.json(
            {
                success: false,
                message: 'Unauthorized',
            },
            { status: 401 }
        )
    }

    const user = await prisma.user.findUnique({
        where: {
            email: req.auth?.user?.email as string
        }
    })
    if(!user){
        return Response.json(
            {
                success: false,
                message: 'User not found',
            },
            { status: 404 }
        )
    }

    const chats = await prisma.chat.findMany({
        where: {
            users: {
                some: {
                    id: user.id
                }
            },
        },
        include: {
            users: true,
        }
    })
  
    const chatsWithMessages = await Promise.all(chats.map(async chat => {
        const messages:Message[] = await prisma.$queryRaw`
        WITH ordered_messages AS (
          SELECT *, 
            SUM(CASE WHEN "read" = true THEN 1 ELSE 0 END) 
            OVER (ORDER BY "createdAt" DESC) AS read_count
          FROM "Message"
          WHERE "chatId" = ${chat.id}  -- Filter messages for the specific chat
          ORDER BY "createdAt" DESC
          LIMIT 100
        )
        SELECT * FROM ordered_messages WHERE read_count = 0 OR read_count = 1;
        `
        return {
            ...chat,
            messages
        }
    }))

    for(let i = 0; i < chatsWithMessages.length; i++){
        const chat = chatsWithMessages[i];
        for(let j = 0; j < chat.messages.length; j++){
            const message = chat.messages[j];
            if(chat.users.find((u) => u.id === user.id)?.id === message.userId){
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
    }

    return Response.json(
        {
            success: true,
            message: 'Chats fetched successfully',
            data: JSON.parse(JSON.stringify(chatsWithMessages, (_, value) =>
                typeof value === "bigint" ? value.toString() : value
            )),
        }
    );    
})