import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = async (req:Request) => {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    if(!email){
        return new Response("Email not provided", {
            status: 400
        });
    }

    const user = await prisma.user.findUnique({
        where: {
            email: email as string
        }
    });

    return Response.json(
        {
            success: true,
            message: 'User found',
            data: user
        },
        { status: 200 }
    );
}