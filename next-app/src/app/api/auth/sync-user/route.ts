import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, name, avatar } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: name || "",
        avatar: avatar || "",
      },
      update: {
        name: name || undefined,
      },
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("Failed to sync user:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }
}
