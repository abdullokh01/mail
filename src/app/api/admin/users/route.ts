import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/crypto";

export const maxDuration = 30;

/**
 * GET list of all users.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

/**
 * POST to create a new user.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Email, password, and role are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists." }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const encryptedPassword = encrypt(password);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: cleanEmail,
        passwordHash,
        encryptedPassword,
        role: role === "ADMIN" ? "ADMIN" : "MANAGER",
      },
    });

    return NextResponse.json({ ok: true, id: user.id });
  } catch (err: any) {
    console.error("Failed to create user:", err);
    return NextResponse.json({ error: err.message || "Failed to create user." }, { status: 500 });
  }
}

/**
 * PUT to update an existing user.
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { id, name, email, password, role } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    
    if (cleanEmail) {
      const existing = await prisma.user.findFirst({
        where: { email: cleanEmail, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: "User with this email already exists." }, { status: 400 });
      }
    }

    const data: any = {};
    if (name !== undefined) data.name = name || null;
    if (cleanEmail !== undefined) data.email = cleanEmail;
    if (role !== undefined) data.role = role === "ADMIN" ? "ADMIN" : "MANAGER";
    
    if (password) {
      data.passwordHash = bcrypt.hashSync(password, 10);
      data.encryptedPassword = encrypt(password);
    }

    await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Failed to update user:", err);
    return NextResponse.json({ error: err.message || "Failed to update user." }, { status: 500 });
  }
}

/**
 * DELETE a user.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (id === session.user.id) {
      return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Failed to delete user:", err);
    return NextResponse.json({ error: err.message || "Failed to delete user." }, { status: 500 });
  }
}
