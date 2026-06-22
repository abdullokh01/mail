import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Action, Category, Deadline, Priority } from "@prisma/client";
import type { ParsedEmail } from "@/lib/gmail";

export interface AIResult {
  summary: string;
  priority: Priority;
  category: Category;
  requiresAction: boolean;
  suggestedAction: Action;
  deadline: Deadline;
  model: string;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const CATEGORIES = [
  "FINANCE",
  "HR",
  "OPERATIONS",
  "PRODUCTION",
  "LEGAL",
  "PROCUREMENT",
  "OTHER",
];
const ACTIONS = ["REPLY", "APPROVE", "DELEGATE", "READ", "IGNORE"];
const DEADLINES = ["TODAY", "TOMORROW", "THIS_WEEK", "NONE"];

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: "Concise summary, max 3 sentences.",
    },
    priority: { type: SchemaType.STRING, enum: PRIORITIES, format: "enum" },
    category: { type: SchemaType.STRING, enum: CATEGORIES, format: "enum" },
    requiresAction: { type: SchemaType.BOOLEAN },
    suggestedAction: { type: SchemaType.STRING, enum: ACTIONS, format: "enum" },
    deadline: { type: SchemaType.STRING, enum: DEADLINES, format: "enum" },
  },
  required: [
    "summary",
    "priority",
    "category",
    "requiresAction",
    "suggestedAction",
    "deadline",
  ],
} as const;

const SYSTEM_PROMPT = `You are an executive assistant AI for Aurum Mail, a smart inbox for executives.
Analyze the email and classify it so a busy executive can triage quickly.
- summary: max 3 sentences, neutral, factual.
- priority: CRITICAL, HIGH, MEDIUM, or LOW. Judge by real business impact and
  whether a human is personally waiting on the executive — not by alarming words.
  - CRITICAL: time-sensitive matters with high business impact (contracts,
    payments, legal deadlines, escalations) that need the executive now.
  - HIGH: important business email from a real person needing the executive's
    decision, reply, or approval soon.
  - MEDIUM: relevant but not urgent; can wait.
  - LOW: automated notifications and machine-generated mail — security/sign-in
    alerts, newsletters, marketing, social, receipts, calendar pings,
    "no-reply"/"notifications@" senders. Classify these LOW even if the wording
    sounds urgent (e.g. "action required", "new sign-in detected"), UNLESS they
    genuinely demand a direct executive decision.
- category: best business domain fit.
- requiresAction: true only if the executive personally must do something.
- suggestedAction: REPLY, APPROVE, DELEGATE, READ, or IGNORE.
- deadline: TODAY, TOMORROW, THIS_WEEK, or NONE if no time pressure.
Return ONLY the structured JSON.`;

function coerce<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  const v = String(value ?? "").toUpperCase().replace(/\s+/g, "_");
  return (allowed as string[]).includes(v) ? (v as T) : fallback;
}

let client: GoogleGenerativeAI | null = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  client ??= new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_RETRIES = Number(process.env.AI_MAX_RETRIES || 3);

/** Parse the server-suggested retry delay (seconds) from a 429 error. */
function retryDelayMs(err: unknown, attempt: number): number {
  const details = (err as { errorDetails?: unknown[] })?.errorDetails ?? [];
  for (const d of details) {
    const info = d as { "@type"?: string; retryDelay?: string };
    if (info["@type"]?.includes("RetryInfo") && info.retryDelay) {
      const secs = parseFloat(info.retryDelay);
      if (!Number.isNaN(secs)) return Math.min(secs * 1000 + 500, 30_000);
    }
  }
  // Exponential backoff fallback, capped.
  return Math.min(2 ** attempt * 1000, 30_000);
}

function isRateLimit(err: unknown): boolean {
  return (err as { status?: number })?.status === 429;
}

/** Heuristic fallback so sync never fully fails if the AI call errors. */
function fallback(): AIResult {
  return {
    summary: "AI analysis unavailable for this email.",
    priority: Priority.MEDIUM,
    category: Category.OTHER,
    requiresAction: false,
    suggestedAction: Action.READ,
    deadline: Deadline.NONE,
    model: `${MODEL} (fallback)`,
  };
}

export async function analyzeEmail(email: ParsedEmail): Promise<AIResult> {
  try {
    const model = getClient().getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: responseSchema as any,
        temperature: 0.2,
      },
    });

    const content = [
      `Subject: ${email.subject}`,
      `From: ${email.sender}${email.senderEmail ? ` <${email.senderEmail}>` : ""}`,
      `Received: ${email.receivedAt.toISOString()}`,
      `Attachments: ${email.attachmentCount}`,
      "",
      email.body.slice(0, 8000),
    ].join("\n");

    let res;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await model.generateContent(content);
        break;
      } catch (err) {
        if (isRateLimit(err) && attempt < MAX_RETRIES) {
          const wait = retryDelayMs(err, attempt);
          console.warn(
            `Gemini 429 — retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`
          );
          await sleep(wait);
          continue;
        }
        throw err;
      }
    }

    const parsed = JSON.parse(res.response.text());

    return {
      summary: String(parsed.summary ?? "").slice(0, 1000) || "No summary.",
      priority: coerce(parsed.priority, PRIORITIES, "MEDIUM") as Priority,
      category: coerce(parsed.category, CATEGORIES, "OTHER") as Category,
      requiresAction: Boolean(parsed.requiresAction),
      suggestedAction: coerce(parsed.suggestedAction, ACTIONS, "READ") as Action,
      deadline: coerce(parsed.deadline, DEADLINES, "NONE") as Deadline,
      model: MODEL,
    };
  } catch (err) {
    console.error("AI analysis failed:", err);
    return fallback();
  }
}

// ─────────────────────────────────────────────
// AI Reply generation
// ─────────────────────────────────────────────

export const REPLY_STYLES = [
  "professional",
  "short",
  "friendly",
  "approve",
  "reject",
  "request_info",
] as const;

export type ReplyStyle = (typeof REPLY_STYLES)[number];

const STYLE_INSTRUCTIONS: Record<ReplyStyle, string> = {
  professional: "Polished, courteous, business-appropriate tone.",
  short: "Very concise — 2-4 sentences maximum, still polite.",
  friendly: "Warm, approachable, conversational but professional.",
  approve: "Clearly approve / agree to the request, with a brief rationale.",
  reject:
    "Politely decline or reject the request, with a short respectful reason.",
  request_info:
    "Ask clear, specific follow-up questions to get the missing information needed.",
};

export interface ReplyInput {
  subject: string;
  sender: string;
  senderEmail: string | null;
  body: string;
  recipientName?: string;
}

/** Generate a professional email reply in the requested style. */
export async function generateReply(
  email: ReplyInput,
  style: ReplyStyle
): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: MODEL,
    systemInstruction: `You are an executive assistant drafting an email reply on behalf of the user.
Write ONLY the reply body — no subject line, no "Subject:", no markdown, no commentary.
Style guidance: ${STYLE_INSTRUCTIONS[style]}
Be context-aware: address the sender's actual points. Keep it ready to send.
Sign off as the user${email.recipientName ? ` (${email.recipientName})` : ""}.`,
    generationConfig: { temperature: 0.5 },
  });

  const prompt = [
    `Reply to this email.`,
    `From: ${email.sender}${email.senderEmail ? ` <${email.senderEmail}>` : ""}`,
    `Subject: ${email.subject}`,
    "",
    "Email content:",
    email.body.slice(0, 8000),
  ].join("\n");

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await model.generateContent(prompt);
      return res.response.text().trim();
    } catch (err) {
      if (isRateLimit(err) && attempt < MAX_RETRIES) {
        await sleep(retryDelayMs(err, attempt));
        continue;
      }
      throw err;
    }
  }
}
