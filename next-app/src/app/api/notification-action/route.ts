import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export const PATCH = async (req:Request) => {
  const session = await auth();
   
  try {
    const { notificationId, action } = await req.json();

    if(!notificationId || typeof action !== "boolean"){
      return NextResponse.json(
        { error: "notificationId and action is required" },
        { status: 400 }
      );
    }

    if(!session?.user){
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if(!notification){
      return NextResponse.json(
        { error: "notification not found" },
        { status: 404 }
      );
    }

    if(notification.accepted){
      return NextResponse.json(
        { error: "notification already accepted" },
        { status: 400 }
      );
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { accepted: action },
    });

    if(updatedNotification.accepted){
      const user1 = await prisma.user.findUnique({
        where: { email: session.user?.email as string },
      });
      const user2 = await prisma.user.findUnique({
        where: { email: updatedNotification.userEmail },
      });

      if(user1 && user2){
        const chat = await prisma.chat.create({
          data: {
            name: `${user1.name}-${user2.name}`,
            users: {
              connect: [{ id: user1.id }, { id: user2.id }],
            },
          },
        });

        const sentNotification = await prisma.notification.create({
          data: {
            user: {
              connect: {
                email: session.user?.email as string,
              },
            },
            targetUser: {
              connect: {
                id: user2.id,
              },
            },
            content: "accepted your message request",
            type: "Accept",
          },
          include:{
            user: true,
          }
        });

        if(!chat){
          return NextResponse.json(
            { error: "Failed to create chat" },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            message: "notification updated",
            data: sentNotification,
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ message: "Notification updated" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
