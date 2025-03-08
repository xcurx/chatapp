import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const POST = auth(async function POST(req) {
    if(!req.auth){
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

    if(targetUserExists.email === req.auth.user?.email){
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
    
    if(type === 'Request'){
      const chatExist = await prisma.chat.findFirst({
        where: {
          AND: [
            {
              users: {
                some: {
                  email: req.auth.user?.email as string
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
                email: req.auth.user?.email as string
            }
        },
        targetUser: {
            connect: {
                id: targetId
            }
        },
        content: content
      }
    });

    return Response.json(
        {
            message: 'Notification sent',
            data: notification
        },
        {status: 201}
    )
})