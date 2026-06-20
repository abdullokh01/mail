import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailClient, getOAuthClient } from "@/lib/google";
import { getAttachment } from "@/lib/gmail";
import type { EmailAttachment } from "@/lib/gmail";

export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, attachmentId } = await params;
  const email = await prisma.email.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Find attachment metadata (filename / mime) stored on the email.
  const meta = ((email.attachments as unknown as EmailAttachment[]) ?? []).find(
    (a) => a.attachmentId === attachmentId
  );

  try {
    const oauth = await getOAuthClient(session.user.id);
    const gmail = getGmailClient(oauth);
    const buffer = await getAttachment(gmail, email.gmailId, attachmentId);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": meta?.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${
          meta?.filename ?? "attachment"
        }"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("Attachment download failed:", err);
    return NextResponse.json(
      { error: "Failed to download attachment" },
      { status: 500 }
    );
  }
}
