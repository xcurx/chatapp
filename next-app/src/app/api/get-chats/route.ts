import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET = async () => {
    const session = await auth();  

    console.log(session?.user)
    
    if(!session || !session.user){
        return Response.json(
            {
                success: false,
                message: 'Unauthorized',
            },
            { status: 401 }
        )
    }

    
    try {
        // fetch all chats for the user with users and only the latest message
        const chats = await prisma.chat.findMany({
            where: {
                users: {
                    some: {
                        id: session.user.id
                    }
                },
            },
            include: {
                users: true,
                messages: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1, // only get the latest message for preview
                }
            }
        });

        // get all chat IDs for the user
        const chatIds = chats.map(chat => chat.id);

        // find all non-received messages (not sent by the current user) before updating
        const messagesToUpdate = await prisma.message.findMany({
            where: {
                chatId: {
                    in: chatIds
                },
                userId: {
                    not: session.user.id // only messages NOT sent by the current user
                },
                received: false
            },
            select: {
                id: true
            }
        });

        // mark all those messages as received
        if (messagesToUpdate.length > 0) {
            await prisma.message.updateMany({
                where: {
                    id: {
                        in: messagesToUpdate.map(m => m.id)
                    }
                },
                data: {
                    received: true
                }
            });
        }

        // return message IDs so frontend can emit socket events
        const receivedMessageIds = messagesToUpdate.map(m => m.id);

        // get unread count for each chat
        const unreadCounts = await prisma.message.groupBy({
            by: ['chatId'],
            where: {
                chatId: {
                    in: chatIds
                },
                userId: {
                    not: session.user.id // only messages NOT sent by the current user
                },
                read: false
            },
            _count: {
                id: true
            }
        });

        // create a map of chatId -> unreadCount
        const unreadCountMap = unreadCounts.reduce((acc, item) => {
            acc[item.chatId] = item._count.id;
            return acc;
        }, {} as Record<string, number>);

        // add unreadCount to each chat
        const chatsWithUnreadCount = chats.map(chat => ({
            ...chat,
            unreadCount: unreadCountMap[chat.id] || 0
        }));

        return Response.json(
            {
                success: true,
                message: 'Chats fetched successfully',
                data: {
                    chats: chatsWithUnreadCount,
                    receivedMessageIds
                },
            }
        );    
    } catch (error) {
        console.log(error)
        return Response.json({ error })
    }
}