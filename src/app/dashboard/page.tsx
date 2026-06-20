import { redirect } from "next/navigation";
import { Priority, Deadline } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { categoryLabel } from "@/lib/labels";
import type {
  DashboardStats,
  EmailDTO,
  InsightStats,
} from "@/types/email";

export const dynamic = "force-dynamic";

const PRIORITY_RANK: Record<Priority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};
const DEADLINE_RANK: Record<Deadline, number> = {
  TODAY: 0,
  TOMORROW: 1,
  THIS_WEEK: 2,
  NONE: 3,
};

function isToday(d: Date | null | undefined): boolean {
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // One slim query powers the list, stats, insights, brief and attention list.
  const [emails, syncState] = await Promise.all([
    prisma.email.findMany({
      where: { userId },
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
      take: 300,
    }),
    prisma.syncState.findUnique({ where: { userId } }),
  ]);

  const analyzed = emails.filter((e) => e.analysis);

  const stats: DashboardStats = {
    total: analyzed.length,
    critical: analyzed.filter((e) => e.analysis!.priority === "CRITICAL").length,
    high: analyzed.filter((e) => e.analysis!.priority === "HIGH").length,
    needReply: analyzed.filter((e) => e.analysis!.suggestedAction === "REPLY")
      .length,
    fyi: analyzed.filter((e) => !e.analysis!.requiresAction).length,
  };

  const insights: InsightStats = {
    approvals: emails.filter(
      (e) => e.analysis?.suggestedAction === "APPROVE" && !e.repliedAt
    ).length,
    dueToday: emails.filter(
      (e) =>
        e.analysis?.deadline === "TODAY" &&
        e.analysis?.requiresAction &&
        !e.repliedAt
    ).length,
    handledToday: emails.filter((e) => isToday(e.repliedAt)).length,
    unreadImportant: emails.filter(
      (e) => !e.isRead && e.analysis?.requiresAction
    ).length,
  };

  // Category breakdown → top category for the brief.
  const catCounts = new Map<string, number>();
  for (const e of analyzed) {
    const c = e.analysis!.category;
    catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
  }
  const topCat = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Executive brief — only surface what's actionable.
  const brief: string[] = [];
  if (stats.critical > 0)
    brief.push(`${stats.critical} critical email(s) need your attention`);
  if (insights.approvals > 0)
    brief.push(`${insights.approvals} awaiting your approval`);
  if (stats.needReply > 0) brief.push(`${stats.needReply} need a reply`);
  if (insights.dueToday > 0)
    brief.push(`${insights.dueToday} due today`);
  if (topCat && topCat[0] !== "OTHER")
    brief.push(
      `Most activity in ${categoryLabel[topCat[0] as keyof typeof categoryLabel]}`
    );
  if (brief.length === 0)
    brief.push("You're all caught up — nothing urgent right now.");

  // Needs-your-attention list: unresolved, ranked by priority then deadline.
  const attention = emails
    .filter((e) => e.analysis?.requiresAction && !e.repliedAt)
    .sort((a, b) => {
      const pa = PRIORITY_RANK[a.analysis!.priority];
      const pb = PRIORITY_RANK[b.analysis!.priority];
      if (pa !== pb) return pa - pb;
      return (
        DEADLINE_RANK[a.analysis!.deadline] -
        DEADLINE_RANK[b.analysis!.deadline]
      );
    })
    .slice(0, 5);

  return (
    <DashboardClient
      user={{
        name: session.user.name ?? "Executive",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
      initialEmails={emails.slice(0, 100) as unknown as EmailDTO[]}
      stats={stats}
      insights={insights}
      brief={brief}
      attention={attention as unknown as EmailDTO[]}
      lastSyncedAt={syncState?.lastSyncedAt?.toISOString() ?? null}
    />
  );
}
