import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const email = await prisma.email.findFirst({
    where: { id, userId: session.user.id },
    include: { analysis: true },
  });

  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ email });
}

/**
 * Update an email's local state (mark read / reviewed / ignored).
 * Body: { isRead?: boolean; reviewed?: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: { isRead?: boolean; reviewedAt?: Date } = {};
  if (typeof body.isRead === "boolean") data.isRead = body.isRead;
  if (body.reviewed === true) data.reviewedAt = new Date();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // updateMany scopes the write to the owner — no row updated if not theirs.
  const result = await prisma.email.updateMany({
    where: { id, userId: session.user.id },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
