import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const POST = async (req:Request) => {
   const { userId, chatId, message, received } = await req.json();

    console.log(userId, chatId, message);
    const sentMessage = await prisma.message.create({
        data: {
            chat:{
                connect: {
                    id: chatId
                }
            },
            user:{
                connect: {
                    id: userId
                }
            },
            content: message,
            received
        },
        include: {
            user: {
                select: {
                    email: true
                }
            }
        }
    })

    return Response.json({sentMessage});
}