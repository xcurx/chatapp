import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = async (req:Request, context: { params: Promise<{ userId: string }> }) => {
    const { userId:userId } = await context.params;
    const session = await auth()

    if(!session?.user){
        return Response.json(
            {
                error: "Unauthorized"
            },
            {
                status: 401
            }
        )
    }

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
}