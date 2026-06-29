import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmailProvider } from "@/lib/providers";

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
  const payload = await req.json().catch(() => ({}));
  const body = (payload.body as string | undefined)?.trim();

  if (!body) {
    return NextResponse.json({ error: "Reply body is empty" }, { status: 400 });
  }

  const email = await prisma.email.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!email.senderEmail) {
    return NextResponse.json(
      { error: "No recipient address found for this email" },
      { status: 400 }
    );
  }

  try {
    const provider = getEmailProvider(session.user.id);

    // Treat gmailId as the In-Reply-To and References parent id.
    const inReplyTo = email.gmailId;
    const subject = email.subject.toLowerCase().startsWith("re:")
      ? email.subject
      : `Re: ${email.subject}`;

    const sentId = await provider.sendEmail({
      to: email.senderEmail,
      subject,
      body,
      threadId: email.threadId,
      inReplyTo,
    });

    // Mark original email as replied
    await prisma.email.update({
      where: { id: email.id },
      data: { repliedAt: new Date() },
    });

    // Get sender info (user)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    // Save the sent email copy into the local database so it is captured by getThreadMessages()
    await prisma.email.create({
      data: {
        userId: session.user.id,
        gmailId: sentId,
        threadId: email.threadId || email.gmailId,
        subject,
        sender: user?.name || user?.email || "Me",
        senderEmail: user?.email || null,
        receivedAt: new Date(),
        preview: body.slice(0, 200).trim(),
        body: body,
        bodyHtml: null,
        attachmentCount: 0,
        isRead: true,
      },
    }).catch(err => {
      console.error("Failed to save local copy of sent reply:", err);
    });

    return NextResponse.json({ ok: true, id: sentId });
  } catch (err) {
    console.error("Send failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to send reply";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
