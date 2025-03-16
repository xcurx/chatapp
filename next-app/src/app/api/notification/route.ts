import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const POST = async function POST(req:Request) {
    const session = await auth();

    if(!session?.user){
      return Response.json(
          {message: 'Unauthorized'},
          {status: 401}
      )
    } 

    const { targetId, type } = await req.json();
    
    if(!targetId || !type){
      return Response.json(
          {message: 'Invalid request'},
          {status: 400}
      )
    }

    const targetUserExists = await prisma.user.findUnique({
      where: {
        id: targetId
      }
    });
    if(!targetUserExists){
      return Response.json(
          {message: 'User not found'},
          {status: 404}
      )
    }

    if(targetUserExists.email === session.user?.email){
      if(type === 'Request'){
        return Response.json(
            {message: 'Cannot send request to self'},
            {status: 400}
        )
      }
      if(type === 'Accept'){
        return Response.json(
            {message: 'Cannot accept request from self'},
            {status: 400}
        )
      }
    }

    const notificationExist = await prisma.notification.findFirst({
      where: {
        AND: [
          {
            user: {
              email: session.user?.email as string
            }
          },
          {
            targetUser: {
              id: targetId
            }
          }
        ]
      }
    })
    if(notificationExist){
      return Response.json(
          {message: 'Request already sent'},
          {status: 400}
      )
    }

    const reverseNotificationExist = await prisma.notification.findFirst({
      where: {
        AND: [
          {
            user: {
              id: targetId
            }
          },
          {
            targetUser: {
              email: session.user?.email as string
            }
          },
          {
            type: 'Request'
          }
        ]
      }
    })
    if(reverseNotificationExist && type === 'Request'){
      const updatedReverseNotification = await prisma.notification.update({
        where: {
          id: reverseNotificationExist.id
        },
        data: {
          read: true,
          accepted: true
        },
        include:{
          user: true,
        }
      });
      const user1 = await prisma.user.findUnique({
        where: {
          email: session.user?.email as string
        }
      })
      const user2 = await prisma.user.findUnique({
        where: {
          id: targetId
        }
      })
      if(user1 && user2){
        await prisma.chat.create({
          data: {
            name: `${user1.name}-${user2.name}`,
            users: {
              connect: [
                { id: user1.id },
                { id: user2.id }
              ]
            }
          }
        })
      }

      const notification = await prisma.notification.create({
        data: {
          user: {
            connect: {
              email: session.user?.email as string
            }
          },
          targetUser: {
            connect: {
              id: targetId
            }
          },
          content: 'accepted your message request',
          type: 'Accept'
        },
        include:{
          user: true,
        }
      })

      return Response.json(
          {
            message: 'Chat created',
            data: {
              notification,
              reverseNotification: updatedReverseNotification
            }
          },
          {status: 200}
      )
    }
    
    if(type === 'Request'){
      const chatExist = await prisma.chat.findFirst({
        where: {
          AND: [
            {
              users: {
                some: {
                  email: session.user?.email as string
                }
              }
            },
            {
              users: {
                some: {
                  id: targetId
                }
              }
            }
          ]
        }
      })
      if(chatExist){
        return Response.json(
            {message: 'Chat already exist'},
            {status: 400}
        )
      }
    }

    let content = '';
    if(type === 'Request'){
      content = 'sent you a message request';
    }
    if(type === 'Accept'){
      content = 'accepted your message request';
    }


    const notification = await prisma.notification.create({
      data: {
        user:{
            connect: {
                email: session.user?.email as string
            }
        },
        targetUser: {
            connect: {
                id: targetId
            }
        },
        content: content,
        type,
        accepted: type === 'Request' ? false : undefined
      },
      include:{
        user: true,
      }
    });

    return Response.json(
        {
            message: 'Request sent',
            data: notification
        },
        {status: 201}
    )
}