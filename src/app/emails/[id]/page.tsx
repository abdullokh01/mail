import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeEmailHtml } from "@/lib/sanitize";
import { EmailDetailView } from "@/components/email/email-detail-view";
import type { EmailDTO } from "@/types/email";

export const dynamic = "force-dynamic";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const email = await prisma.email.findFirst({
    where: { id, userId: session.user.id },
    include: { analysis: true },
  });

  if (!email) notFound();

  // Sanitize on the server (Node) — avoids shipping a jsdom-based sanitizer.
  const safeBodyHtml = sanitizeEmailHtml(email.bodyHtml);

  return (
    <EmailDetailView
      email={email as unknown as EmailDTO}
      safeBodyHtml={safeBodyHtml}
      userName={session.user.name ?? "Executive"}
    />
  );
}
