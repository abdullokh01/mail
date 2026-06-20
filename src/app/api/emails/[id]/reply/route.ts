import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReply, REPLY_STYLES, type ReplyStyle } from "@/lib/ai";

export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const style = body.style as ReplyStyle;

  if (!REPLY_STYLES.includes(style)) {
    return NextResponse.json({ error: "Invalid reply style" }, { status: 400 });
  }

  const email = await prisma.email.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const reply = await generateReply(
      {
        subject: email.subject,
        sender: email.sender,
        senderEmail: email.senderEmail,
        body: email.body,
        recipientName: session.user.name ?? undefined,
      },
      style
    );
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Reply generation failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate reply";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
