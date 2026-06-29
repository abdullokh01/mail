import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import type { EmailProvider } from "./EmailProvider";
import type { ParsedEmail, SendReplyParams, ThreadMessage } from "@/lib/gmail";

export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(re|fwd|fw|aw|reply):\s*/i, "")
    .trim();
}

export class IMAPProvider implements EmailProvider {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async getCredentials() {
    const adminEmail = (process.env.EMAIL_USERNAME || "abdullokh.ibragimov@aggroup.uz").trim().toLowerCase();
    const adminPassword = process.env.EMAIL_PASSWORD || "4e97f7Ao9";

    const user = await prisma.user.findUnique({
      where: { id: this.userId },
    });

    if (user && user.email?.trim().toLowerCase() === adminEmail) {
      return { username: adminEmail, password: adminPassword };
    }

    if (user && user.encryptedPassword) {
      try {
        const decryptedPassword = decrypt(user.encryptedPassword);
        return { username: user.email!, password: decryptedPassword };
      } catch (err) {
        console.error("Failed to decrypt user IMAP password", err);
      }
    }

    return { username: adminEmail, password: adminPassword };
  }

  async listMessageIds(max: number): Promise<string[]> {
    const credentials = await this.getCredentials();
    const client = new ImapFlow({
      host: process.env.IMAP_HOST || "mail.aggroup.uz",
      port: parseInt(process.env.IMAP_PORT || "993"),
      secure: true,
      auth: {
        user: credentials.username,
        pass: credentials.password,
      },
      logger: false,
    });

    await client.connect();
    const uids: string[] = [];

    const lock = await client.getMailboxLock("INBOX");
    try {
      const status = await client.status("INBOX", { messages: true });
      const total = status.messages || 0;
      if (total > 0) {
        const start = Math.max(1, total - max + 1);
        const end = total;
        for await (const msg of client.fetch(`${start}:${end}`, { uid: true })) {
          if (msg.uid) {
            uids.push(String(msg.uid));
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return uids.reverse();
  }

  async getParsedMessage(id: string): Promise<ParsedEmail | null> {
    const credentials = await this.getCredentials();
    const client = new ImapFlow({
      host: process.env.IMAP_HOST || "mail.aggroup.uz",
      port: parseInt(process.env.IMAP_PORT || "993"),
      secure: true,
      auth: {
        user: credentials.username,
        pass: credentials.password,
      },
      logger: false,
    });

    await client.connect();
    let parsedEmail: ParsedEmail | null = null;

    const lock = await client.getMailboxLock("INBOX");
    try {
      const msg = await client.fetchOne(id, {
        source: true,
        uid: true,
        flags: true,
        envelope: true,
        internalDate: true,
      }, { uid: true });

      if (msg && msg.source) {
        const parsed = await simpleParser(msg.source);
        
        const fromHeader = parsed.from?.value?.[0];
        const sender = fromHeader?.name || fromHeader?.address || "(unknown)";
        const senderEmail = fromHeader?.address || null;
        
        const subject = parsed.subject || "(no subject)";
        const receivedAt = parsed.date ? new Date(parsed.date) : (msg.internalDate ? new Date(msg.internalDate) : new Date());
        
        const text = parsed.text || "";
        const html = parsed.html || null;
        const preview = text.slice(0, 200).trim() || subject;

        const attachments = (parsed.attachments || []).map((att, index) => {
          const attachmentId = att.contentId || `att-${index}-${id}`;
          return {
            attachmentId,
            filename: att.filename || `attachment-${index}`,
            mimeType: att.contentType || "application/octet-stream",
            size: att.size,
          };
        });

        const normalized = normalizeSubject(subject);
        const similarEmail = await prisma.email.findFirst({
          where: {
            userId: this.userId,
            subject: {
              mode: "insensitive",
              endsWith: normalized,
            },
          },
          select: { threadId: true },
        });

        const threadId = similarEmail?.threadId || id;
        const isRead = msg.flags ? msg.flags.has("\\Seen") : false;

        parsedEmail = {
          gmailId: id,
          threadId,
          subject,
          sender,
          senderEmail,
          receivedAt,
          preview,
          body: text.slice(0, 20000),
          bodyHtml: html ? html.slice(0, 100000) : null,
          attachmentCount: attachments.length,
          attachments,
          isRead,
        };
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return parsedEmail;
  }

  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    const credentials = await this.getCredentials();
    const dbMessages = await prisma.email.findMany({
      where: { threadId, userId: this.userId },
      orderBy: { receivedAt: "asc" },
    });

    return dbMessages.map((m) => {
      const isFromMe =
        m.senderEmail?.toLowerCase() === credentials.username.toLowerCase();
      return {
        id: m.gmailId,
        from: {
          name: m.sender,
          email: m.senderEmail,
        },
        date: m.receivedAt,
        text: m.body,
        html: m.bodyHtml,
        isFromMe,
        attachmentCount: m.attachmentCount,
      };
    });
  }

  async sendEmail(params: SendReplyParams): Promise<string> {
    const credentials = await this.getCredentials();
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "mail.aggroup.uz",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: parseInt(process.env.SMTP_PORT || "465") === 465,
      auth: {
        user: credentials.username,
        pass: credentials.password,
      },
    });

    const replySubject = params.subject.toLowerCase().startsWith("re:")
      ? params.subject
      : `Re: ${params.subject}`;

    const headers: Record<string, string> = {};
    if (params.inReplyTo) {
      headers["In-Reply-To"] = params.inReplyTo;
      headers["References"] = params.inReplyTo;
    }

    const info = await transporter.sendMail({
      from: `"${credentials.username}" <${credentials.username}>`,
      to: params.to,
      subject: replySubject,
      text: params.body,
      headers,
    });

    return info.messageId;
  }

  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    const credentials = await this.getCredentials();
    const client = new ImapFlow({
      host: process.env.IMAP_HOST || "mail.aggroup.uz",
      port: parseInt(process.env.IMAP_PORT || "993"),
      secure: true,
      auth: {
        user: credentials.username,
        pass: credentials.password,
      },
      logger: false,
    });

    await client.connect();
    let content = Buffer.alloc(0);

    const lock = await client.getMailboxLock("INBOX");
    try {
      const msg = await client.fetchOne(messageId, { source: true }, { uid: true });
      if (msg && msg.source) {
        const parsed = await simpleParser(msg.source);
        const attachments = parsed.attachments || [];
        const att = attachments.find((a, index) => {
          const generatedId = a.contentId || `att-${index}-${messageId}`;
          return generatedId === attachmentId;
        });
        if (att) {
          content = Buffer.from(att.content);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return content;
  }
}
