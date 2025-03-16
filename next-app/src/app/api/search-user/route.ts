import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = async (req:Request) => {
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
                            email: session?.user.email as string
                        }
                    }
                }
            },
            targetNotifications:{
                where:{
                    userEmail: session?.user.email as string
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
}