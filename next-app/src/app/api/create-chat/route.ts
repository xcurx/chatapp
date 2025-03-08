import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const POST = async (req:Request) => {
    const { user1, user2 } = await req.json();

    if (!user1 || !user2) {
        return Response.json(
            {
                success: false,
                message: 'Missing required fields',
            },
            { status: 500 }
        );
    }

    const user1Exists = await prisma.user.findUnique({ where: { id: user1 } });
    const user2Exists = await prisma.user.findUnique({ where: { id: user2 } });
    if(!user1Exists || !user2Exists){
        return Response.json(
            {
                success: false,
                message: 'User does not exist',
            },
            { status: 500 }
        );
    }

    const uniqueChatExists = await prisma.chat.findFirst({
        where: {
            users: {
                every: {
                    id: {
                        in: [user1, user2]
                    }
                }
            }
        }
    })
    if(uniqueChatExists){
        return Response.json(
            {
                success: false,
                message: 'Chat already exists',
            },
            { status: 400 }
        );
    }

    const chat = await prisma.chat.create({
        data: {
            name: `${user1Exists.name}-${user2Exists.name}`,
            users: {
                connect: [
                    { id: user1 },
                    { id: user2 }
                ]
            }
        },
        include: {
            users: true
        }
    });

    return Response.json(
        {
            success: true,
            data: chat,
        },
        { status: 200 }
    );
}