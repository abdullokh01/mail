import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailClient, getOAuthClient } from "@/lib/google";
import { getMessageIdHeader, sendReply } from "@/lib/gmail";

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
    const oauth = await getOAuthClient(session.user.id);
    const gmail = getGmailClient(oauth);

    const inReplyTo = await getMessageIdHeader(gmail, email.gmailId).catch(
      () => null
    );
    const subject = email.subject.toLowerCase().startsWith("re:")
      ? email.subject
      : `Re: ${email.subject}`;

    const sentId = await sendReply(gmail, {
      to: email.senderEmail,
      subject,
      body,
      threadId: email.threadId,
      inReplyTo,
    });

    await prisma.email.update({
      where: { id: email.id },
      data: { repliedAt: new Date() },
    });

    return NextResponse.json({ ok: true, id: sentId });
  } catch (err) {
    console.error("Send failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to send reply";
    // Most common cause: missing gmail.send scope (needs re-login).
    const needsReauth = /insufficient|scope|permission|forbidden/i.test(
      message
    );
    return NextResponse.json(
      {
        error: needsReauth
          ? "Missing send permission. Please sign out and sign in again to grant Gmail send access."
          : message,
        needsReauth,
      },
      { status: 500 }
    );
  }
}
