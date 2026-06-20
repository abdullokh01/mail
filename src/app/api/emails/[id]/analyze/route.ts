import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailClient, getOAuthClient } from "@/lib/google";
import { getParsedMessage } from "@/lib/gmail";
import { analyzeEmail } from "@/lib/ai";

export const maxDuration = 30;

/**
 * Re-fetch the message from Gmail (backfilling full body / HTML / attachments)
 * and re-run the AI analysis for a single email.
 */
export async function POST(
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
  });
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Backfill latest content from Gmail (body, HTML, attachments, read state).
    const oauth = await getOAuthClient(session.user.id);
    const gmail = getGmailClient(oauth);
    const parsed = await getParsedMessage(gmail, email.gmailId);

    if (parsed) {
      await prisma.email.update({
        where: { id: email.id },
        data: {
          body: parsed.body,
          bodyHtml: parsed.bodyHtml,
          preview: parsed.preview,
          attachmentCount: parsed.attachmentCount,
          attachments: parsed.attachments as unknown as Prisma.InputJsonValue,
          isRead: parsed.isRead,
        },
      });
    }

    const source = parsed ?? {
      gmailId: email.gmailId,
      threadId: email.threadId,
      subject: email.subject,
      sender: email.sender,
      senderEmail: email.senderEmail,
      receivedAt: email.receivedAt,
      preview: email.preview,
      body: email.body,
      bodyHtml: email.bodyHtml,
      attachmentCount: email.attachmentCount,
      attachments: [],
      isRead: email.isRead,
    };

    const ai = await analyzeEmail(source);
    const analysis = await prisma.analysis.upsert({
      where: { emailId: email.id },
      create: {
        emailId: email.id,
        summary: ai.summary,
        priority: ai.priority,
        category: ai.category,
        requiresAction: ai.requiresAction,
        suggestedAction: ai.suggestedAction,
        deadline: ai.deadline,
        model: ai.model,
      },
      update: {
        summary: ai.summary,
        priority: ai.priority,
        category: ai.category,
        requiresAction: ai.requiresAction,
        suggestedAction: ai.suggestedAction,
        deadline: ai.deadline,
        model: ai.model,
      },
    });

    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    console.error("Re-analysis failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to re-analyze";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
