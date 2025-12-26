import { auth } from "@/lib/auth";
import { Prisma, PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export const POST = async (req: Request, context: { params: Promise<{ chatId: string }> }) => {
    const { chatId:chatId } = await context.params;
    const session = await auth();
    const { cursor, isForward, limit }: { cursor: string; isForward: boolean, limit:number } = await req.json();

    if(!session?.user){
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if(!chatId){
        return NextResponse.json({ success: false, message: 'Chat Id not found' }, { status: 400 });
    }

    if(!limit){
        return NextResponse.json({ success: false, message: 'Limit not found' }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            messages: { orderBy: { createdAt: 'desc' } },
            users: true
        }
    }); 

    if (!chat) {
        return NextResponse.json({ success: false, message: 'Chat not found' }, { status: 404 });
    }

    const messageQuery = {
        where: { chatId },
        take: limit + 1,
        orderBy: { createdAt: isForward ? Prisma.SortOrder.asc : Prisma.SortOrder.desc },
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        include: { user: true }
    };

    const messages = await prisma.message.findMany(messageQuery);

    for(let i = 0; i < messages.length; i++){
        const message = messages[i];
        if (chat.users.find(u => u.email === session?.user?.email)?.id === message.userId) continue;
        if (message.received) continue;

        await prisma.message.update({
            where: { id: message.id },
            data: { received: true }
        });

        messages[i].received = true;
    }

    const hasMore = messages.length > limit;
    if(hasMore) messages.pop();

    const nextCursor = messages.length ? messages[messages.length - 1].id : null;

    return NextResponse.json({
        success: true,
        message: 'Chats fetched successfully',
        data: messages,
        hasMore,
        nextCursor,
        isForward
    }, { status: 200 });
};
