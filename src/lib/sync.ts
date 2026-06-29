import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEmailProvider } from "@/lib/providers";
import { analyzeEmail } from "@/lib/ai";

export interface SyncResult {
  fetched: number;
  created: number;
  analyzed: number;
  skipped: number;
}

const SYNC_LIMIT = Number(process.env.EMAIL_SYNC_LIMIT || 100);
// Optional pause between AI calls to respect per-minute quotas (free tier ~15 RPM).
const AI_THROTTLE_MS = Number(process.env.AI_THROTTLE_MS || 0);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sync emails for a user using the configured EmailProvider.
 * - Lists the newest N message ids.
 * - Stores only messages not already in the DB (incremental).
 * - Runs AI analysis on each newly stored email.
 */
export async function syncUserEmails(userId: string): Promise<SyncResult> {
  const provider = getEmailProvider(userId);

  const ids = await provider.listMessageIds(SYNC_LIMIT);

  // Which of these do we already have?
  const existing = await prisma.email.findMany({
    where: { userId, gmailId: { in: ids } },
    select: { gmailId: true },
  });
  const existingIds = new Set(existing.map((e) => e.gmailId));
  const newIds = ids.filter((id) => !existingIds.has(id));

  let created = 0;
  let analyzed = 0;

  for (const id of newIds) {
    if (AI_THROTTLE_MS > 0 && created > 0) await sleep(AI_THROTTLE_MS);
    try {
      const parsed = await provider.getParsedMessage(id);
      if (!parsed) continue;

      const email = await prisma.email.create({
        data: {
          userId,
          gmailId: parsed.gmailId,
          threadId: parsed.threadId,
          subject: parsed.subject,
          sender: parsed.sender,
          senderEmail: parsed.senderEmail,
          receivedAt: parsed.receivedAt,
          preview: parsed.preview,
          body: parsed.body,
          bodyHtml: parsed.bodyHtml,
          attachmentCount: parsed.attachmentCount,
          attachments: parsed.attachments as unknown as Prisma.InputJsonValue,
          isRead: parsed.isRead,
        },
      });
      created += 1;

      const ai = await analyzeEmail(parsed);
      await prisma.analysis.create({
        data: {
          emailId: email.id,
          summary: ai.summary,
          priority: ai.priority,
          category: ai.category,
          requiresAction: ai.requiresAction,
          suggestedAction: ai.suggestedAction,
          deadline: ai.deadline,
          model: ai.model,
        },
      });
      analyzed += 1;
    } catch (err) {
      console.error(`Failed to sync message ${id}:`, err);
    }
  }

  await prisma.syncState.upsert({
    where: { userId },
    create: { userId, lastSyncedAt: new Date() },
    update: { lastSyncedAt: new Date() },
  });

  return {
    fetched: ids.length,
    created,
    analyzed,
    skipped: ids.length - newIds.length,
  };
}
