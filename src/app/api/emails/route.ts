import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const filter = searchParams.get("filter"); // critical | reply | fyi

  const where: Prisma.EmailWhereInput = { userId: session.user.id };

  if (q) {
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { sender: { contains: q, mode: "insensitive" } },
      { senderEmail: { contains: q, mode: "insensitive" } },
      { preview: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filter === "critical") {
    where.analysis = { priority: "CRITICAL" };
  } else if (filter === "reply") {
    where.analysis = { suggestedAction: "REPLY" };
  } else if (filter === "fyi") {
    where.analysis = { requiresAction: false };
  }

  const emails = await prisma.email.findMany({
    where,
    select: {
      id: true,
      subject: true,
      sender: true,
      senderEmail: true,
      receivedAt: true,
      preview: true,
      attachmentCount: true,
      isRead: true,
      repliedAt: true,
      analysis: true,
    },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ emails });
}
