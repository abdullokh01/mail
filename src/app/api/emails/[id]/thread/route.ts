import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailClient, getOAuthClient } from "@/lib/google";
import { getThreadMessages } from "@/lib/gmail";
import { sanitizeEmailHtml } from "@/lib/sanitize";

export const maxDuration = 30;

/**
 * Return the full Gmail conversation for an email — the original plus every
 * reply (sent by the user and received back). The focused message is flagged
 * so the UI can show the rest as the reply chain.
 */
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
    select: { gmailId: true, threadId: true },
  });
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!email.threadId) {
    return NextResponse.json({ messages: [] });
  }

  try {
    const oauth = await getOAuthClient(session.user.id);
    const gmail = getGmailClient(oauth);
    const messages = await getThreadMessages(gmail, email.threadId);

    const safe = messages.map((m) => ({
      id: m.id,
      from: m.from,
      date: m.date.toISOString(),
      isFromMe: m.isFromMe,
      isCurrent: m.id === email.gmailId,
      html: sanitizeEmailHtml(m.html),
      text: m.text,
      attachmentCount: m.attachmentCount,
    }));

    return NextResponse.json({ messages: safe });
  } catch (err) {
    console.error("Thread fetch failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to load conversation";
    const needsReauth = /insufficient|scope|permission|forbidden/i.test(message);
    return NextResponse.json(
      {
        error: needsReauth
          ? "Missing Gmail permission. Please sign out and sign in again."
          : message,
        needsReauth,
      },
      { status: 500 }
    );
  }
}
