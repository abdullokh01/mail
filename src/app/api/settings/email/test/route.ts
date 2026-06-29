import { NextRequest, NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export const maxDuration = 30;

/**
 * GET current email settings (masked password).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  const adminEmail = (process.env.EMAIL_USERNAME || "abdullokh.ibragimov@aggroup.uz").trim().toLowerCase();
  const hasPassword = user?.email?.trim().toLowerCase() === adminEmail 
    ? !!process.env.EMAIL_PASSWORD 
    : !!user?.encryptedPassword;

  return NextResponse.json({
    imapHost: process.env.IMAP_HOST || "mail.aggroup.uz",
    imapPort: process.env.IMAP_PORT || "993",
    smtpHost: process.env.SMTP_HOST || "mail.aggroup.uz",
    smtpPort: process.env.SMTP_PORT || "465",
    email: user?.email || "",
    hasPassword,
  });
}

/**
 * POST to test IMAP and SMTP connections.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const imapHost = body.imapHost || process.env.IMAP_HOST || "mail.aggroup.uz";
    const imapPort = parseInt(body.imapPort || process.env.IMAP_PORT || "993");
    const smtpHost = body.smtpHost || process.env.SMTP_HOST || "mail.aggroup.uz";
    const smtpPort = parseInt(body.smtpPort || process.env.SMTP_PORT || "465");
    const email = body.email || "";
    let password = body.password || "";

    // If password is not provided or is the masked password, load it from env or DB
    if (!password || password === "••••••••") {
      const adminEmail = (process.env.EMAIL_USERNAME || "abdullokh.ibragimov@aggroup.uz").trim().toLowerCase();
      if (email.trim().toLowerCase() === adminEmail) {
        password = process.env.EMAIL_PASSWORD || "4e97f7Ao9";
      } else {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
        });
        if (user && user.encryptedPassword) {
          password = decrypt(user.encryptedPassword);
        }
      }
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required to test connection." }, { status: 400 });
    }

    // 1. Test IMAP Connection
    const imapClient = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: true,
      auth: {
        user: email,
        pass: password,
      },
      logger: false,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
    });

    try {
      await imapClient.connect();
      await imapClient.logout();
    } catch (err: any) {
      console.error("IMAP connection test failed:", err);
      const isAuthError = /authentication|login|failed|invalid/i.test(err.message || "");
      if (isAuthError) {
        return NextResponse.json({ status: "Authentication failed", error: err.message });
      } else {
        return NextResponse.json({ status: "Server unavailable", error: err.message });
      }
    }

    // 2. Test SMTP Connection
    const smtpTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: email,
        pass: password,
      },
      connectionTimeout: 5000,
    });

    try {
      await smtpTransporter.verify();
    } catch (err: any) {
      console.error("SMTP connection test failed:", err);
      const isAuthError = /authentication|login|failed|invalid/i.test(err.message || "");
      if (isAuthError) {
        return NextResponse.json({ status: "Authentication failed", error: err.message });
      } else {
        return NextResponse.json({ status: "Server unavailable", error: err.message });
      }
    }

    return NextResponse.json({ status: "Success" });
  } catch (err: any) {
    console.error("Connection test unexpected error:", err);
    return NextResponse.json({ status: "Server unavailable", error: err.message });
  }
}
