import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = auth(async (req) => {
    if(!req.auth?.user){
        return Response.json(
            {
                success: false,
                message: 'Unauthorized access'
            },
            { status: 401 }
        )
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('query');

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: query as string, mode: 'insensitive' } },
                { email: { contains: query as string, mode: 'insensitive' } }
            ]
        },
        include:{
            chats:{
                where:{
                    users:{
                        some:{
                            id: req.auth?.user.id
                        }
                    }
                }
            },
            targetNotifications:{
                where:{
                    userEmail: req.auth?.user.email as string
                }
            }
        }
    });

    return Response.json(
        {
            success: true,
            message: 'Search results fetched successfully',
            data: users
        },
        { status: 200 }
    )
})