import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = auth(async (req) => {
    if(!req.auth?.user){
        return Response.json(
            {
                error: "Unauthorized"
            },
            {
                status: 401
            }
        )
    }

    const url = new URL(req.url);
    const userId = url.pathname.split('/').pop();
    

    const user = await prisma.notification.findMany({
        where: {
            targetId: userId
        },
        include:{
            user: true
        }
    })

    return Response.json(
        {
            message: 'Notificatios fetched',
            data: user
        },
        {status: 201}
    )
})