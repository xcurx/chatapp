import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const PATCH = auth(async (req) => {
    const { notificationId } = await req.json();

    if(!notificationId) {
        return Response.json(
            { error: "notificationId is required" },
            { status: 400 }
        );
    }

    const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
    });
    if(!notification) {
        return Response.json(
            { error: "notification not found" },
            { status: 404 }
        );
    }
    if(notification.read) {
        return Response.json(
            { error: "notification already read" },
            { status: 400 }
        );
    }

    await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
    });

    return Response.json(
        { message: "notification updated" },
        { status: 200 }
    )
})