import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = async (req:Request, context: { params: Promise<{ userId: string }> }) => {
    const { userId:userId } = await context.params;

    if(!userId){
        return Response.json(
            {
                success: false,
                message: 'User Id not found',
            },
            { status: 500 }
        )
    }

    const userExist = await prisma.user.findUnique({
        where: {
            id: userId
        }
    })
    if(!userExist){
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
                    id: userId
                }
            }
        },
    })

    return Response.json(
        {
            success: true,
            message: 'Chats fetched successfully',
            data: chats
        },
        { status: 200 }
    )
}