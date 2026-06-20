import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncUserEmails } from "@/lib/sync";

export const maxDuration = 60; // Vercel: allow long-running sync

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncUserEmails(session.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Sync failed:", err);
    const message =
      err instanceof Error ? err.message : "Sync failed unexpectedly";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
