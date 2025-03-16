import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = auth(async (req,ctx) => {
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

    const params = await ctx.params;
    const userId = params?.userId
    

    const user = await prisma.notification.findMany({
        where: {
            targetId: userId as string
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