import type { gmail_v1 } from "googleapis";

export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ParsedEmail {
  gmailId: string;
  threadId: string | null;
  subject: string;
  sender: string;
  senderEmail: string | null;
  receivedAt: Date;
  preview: string;
  body: string;
  bodyHtml: string | null;
  attachmentCount: number;
  attachments: EmailAttachment[];
  isRead: boolean;
}

/** List the newest message ids in the user's inbox. */
export async function listMessageIds(
  gmail: gmail_v1.Gmail,
  max: number
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < max) {
    const res = await gmail.users.messages.list({
      userId: "me",
      maxResults: Math.min(100, max - ids.length),
      q: "in:inbox",
      pageToken,
    });
    const messages = res.data.messages ?? [];
    ids.push(...messages.map((m) => m.id!).filter(Boolean));
    pageToken = res.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  return ids.slice(0, max);
}

function decodeBase64Url(data?: string | null): string {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf-8"
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

interface Extracted {
  text: string;
  html: string | null;
  attachments: EmailAttachment[];
}

function extractParts(payload?: gmail_v1.Schema$MessagePart): Extracted {
  let text = "";
  let html = "";
  const attachments: EmailAttachment[] = [];

  const walk = (part?: gmail_v1.Schema$MessagePart) => {
    if (!part) return;
    const mime = part.mimeType ?? "";
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: mime || "application/octet-stream",
        size: part.body.size ?? 0,
      });
    }
    if (mime === "text/plain" && part.body?.data) {
      text += decodeBase64Url(part.body.data);
    } else if (mime === "text/html" && part.body?.data) {
      html += decodeBase64Url(part.body.data);
    }
    part.parts?.forEach(walk);
  };

  walk(payload);

  const body = text.trim() || (html ? stripHtml(html) : "");
  return { text: body, html: html.trim() || null, attachments };
}

function parseFrom(from: string): { name: string; email: string | null } {
  const match = from.match(/^(.*?)<(.+?)>$/);
  if (match) {
    const name = match[1].replace(/['"]/g, "").trim();
    return { name: name || match[2], email: match[2].trim() };
  }
  return { name: from.trim(), email: from.includes("@") ? from.trim() : null };
}

/** Fetch and parse a single Gmail message into our shape. */
export async function getParsedMessage(
  gmail: gmail_v1.Gmail,
  id: string
): Promise<ParsedEmail | null> {
  const res = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "full",
  });
  const msg = res.data;
  if (!msg.payload) return null;

  const headers = msg.payload.headers ?? [];
  const header = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

  const from = header("from");
  const { name, email } = parseFrom(from);
  const subject = header("subject") || "(no subject)";
  const dateHeader = header("date");
  const receivedAt = msg.internalDate
    ? new Date(Number(msg.internalDate))
    : dateHeader
    ? new Date(dateHeader)
    : new Date();

  const { text, html, attachments } = extractParts(msg.payload);
  const labelIds = msg.labelIds ?? [];

  return {
    gmailId: msg.id!,
    threadId: msg.threadId ?? null,
    subject,
    sender: name,
    senderEmail: email,
    receivedAt,
    preview: (msg.snippet ?? text.slice(0, 200)).trim(),
    body: text.slice(0, 20000),
    bodyHtml: html ? html.slice(0, 100000) : null,
    attachmentCount: attachments.length,
    attachments,
    isRead: !labelIds.includes("UNREAD"),
  };
}

export interface ThreadMessage {
  id: string;
  from: { name: string; email: string | null };
  date: Date;
  text: string;
  html: string | null;
  isFromMe: boolean;
  attachmentCount: number;
}

/**
 * Fetch every message in a Gmail thread, oldest first.
 * `isFromMe` is true for messages the user sent (carry the SENT label),
 * which lets the UI lay the thread out as a conversation.
 */
export async function getThreadMessages(
  gmail: gmail_v1.Gmail,
  threadId: string
): Promise<ThreadMessage[]> {
  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  return (res.data.messages ?? []).map((msg) => {
    const headers = msg.payload?.headers ?? [];
    const header = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
      "";

    const { name, email } = parseFrom(header("from"));
    const date = msg.internalDate
      ? new Date(Number(msg.internalDate))
      : header("date")
      ? new Date(header("date"))
      : new Date();

    const { text, html, attachments } = extractParts(msg.payload ?? undefined);

    return {
      id: msg.id!,
      from: { name, email },
      date,
      text: text.slice(0, 20000),
      html: html ? html.slice(0, 100000) : null,
      isFromMe: (msg.labelIds ?? []).includes("SENT"),
      attachmentCount: attachments.length,
    };
  });
}

function encodeHeader(value: string): string {
  // RFC 2047 encode non-ASCII header values (e.g. names/subjects).
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

export interface SendReplyParams {
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
  inReplyTo?: string | null;
}

/** Send a plain-text reply, threaded to the original message when possible. */
export async function sendReply(
  gmail: gmail_v1.Gmail,
  { to, subject, body, threadId, inReplyTo }: SendReplyParams
): Promise<string> {
  const headers = [
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
  ];
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  const raw = `${headers.join("\r\n")}\r\n\r\n${body}`;
  const encoded = Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded, threadId: threadId ?? undefined },
  });
  return res.data.id ?? "";
}

/** Read the RFC Message-ID header of a message (for reply threading). */
export async function getMessageIdHeader(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<string | null> {
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["Message-ID"],
  });
  const headers = res.data.payload?.headers ?? [];
  return (
    headers.find((h) => h.name?.toLowerCase() === "message-id")?.value ?? null
  );
}

/** Fetch a single attachment's raw bytes from Gmail. */
export async function getAttachment(
  gmail: gmail_v1.Gmail,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const res = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });
  const data = res.data.data ?? "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
