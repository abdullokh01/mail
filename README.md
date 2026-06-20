# B-Point Executive Decision Center (MVP)

AI-powered email triage for executives. Connects to **Gmail** via the Google API,
pulls your latest 100 emails, and uses **Gemini** to summarize, prioritize, and
categorize each one — so you instantly see what needs attention.

> MVP scope: **read-only**. The app never sends, deletes, or modifies email.

---

## ✨ Features

- **Google OAuth** sign-in (Auth.js / NextAuth v5) with `gmail.readonly` scope.
- **Gmail sync** — fetch latest 100 emails; incremental (only new emails) on refresh.
- **AI analysis** per email (Gemini): summary, priority, category, requires-action,
  suggested action, deadline — stored in PostgreSQL.
- **Dashboard** — Critical / High Priority / Need Reply / FYI stat cards (clickable
  filters) + Recent Emails list.
- **Email detail** — original email + AI summary, priority, category, suggested action.
- **Search** by subject, sender, or keyword.
- **Refresh** ("Sync Outlook") — fetch + analyze only new emails.
- Responsive, **dark mode**, loading states, error handling, **token refresh**.

### MVP-2

- **Email detail page** (`/emails/[id]`) — header, AI analysis card, full HTML
  body (sanitized), attachments (name / size / download), Back action.
- **Refresh AI Analysis** — re-fetches the message from Gmail (backfilling HTML
  body + attachment metadata) and re-runs the AI classification.
- **AI Reply Generator** — generate a context-aware reply in 6 styles
  (Professional, Short, Friendly, Approve, Reject, Request Info), editable, with
  Copy / Regenerate / Send (Send is UI-only in this MVP).
- **Attachment download** via `GET /api/emails/[id]/attachments/[attachmentId]`.
- **Send reply** via Gmail (`GET /api/emails/[id]/send`) — requires `gmail.send`
  scope; replies are threaded and the email is marked replied.
- **Executive overview** on the dashboard: a data-driven "Today's Brief",
  a "Needs your attention" queue (urgent unresolved emails, ranked by priority
  & deadline), and insight metrics (Approvals / Due Today / Handled Today).
- **Clear list states**: unread (bold + gold), read (recessed), replied
  (green check + badge); priority shown as a colored left edge.
- **Premium brand theme** — warm neutral palette with gold accents, Aurum Global
  Group logo.

---

## 🧱 Tech Stack

| Layer    | Tech                                                  |
| -------- | ----------------------------------------------------- |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui |
| Backend  | Next.js API Routes, Google Gmail API, Gemini API      |
| ORM / DB | Prisma + PostgreSQL (Supabase)                        |
| Auth     | Auth.js (NextAuth v5) — Google OAuth, Prisma adapter  |
| Deploy   | Vercel                                                |

---

## 🚀 Getting Started

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` → `.env` and fill in values:

```bash
cp .env.example .env
```

Key variables:

- `DATABASE_URL` / `DIRECT_URL` — Supabase Postgres (see **Database** below).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Cloud OAuth client.
- `NEXTAUTH_SECRET` / `AUTH_SECRET` — `openssl rand -base64 32`.
- `GEMINI_API_KEY` / `GEMINI_MODEL` — Google AI key + model (`gemini-2.0-flash`).

### 3. Database

This project uses **Supabase Postgres**.

> ⚠️ **IPv4 / Pooler note:** Supabase's *direct* connection
> (`db.<ref>.supabase.co:5432`) is **IPv6-only**. If your machine or host (incl.
> Vercel) has no IPv6 route, use the **Transaction Pooler** instead:
>
> ```
> postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
> ```
>
> Get both strings from Supabase → **Connect** → ORMs / Connection string.
> URL-encode special chars in the password (`$`→`%24`, `!`→`%21`).

Push the schema:

```bash
npm run db:push      # or: npm run db:migrate
```

### 4. Google Cloud setup

1. Enable the **Gmail API**.
2. OAuth consent screen → add scope `.../auth/gmail.readonly` and your test users.
3. Credentials → OAuth client → Authorized redirect URI:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://<your-domain>/api/auth/callback/google` (prod)

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 → sign in with Google → click **Sync Outlook**.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # Auth.js handlers
│   │   ├── sync/route.ts                 # POST: sync + analyze new emails
│   │   └── emails/route.ts               # GET: list + search + filter
│   │   └── emails/[id]/route.ts          # GET: single email
│   ├── dashboard/page.tsx                # Dashboard (server: stats + initial data)
│   ├── login/page.tsx                    # Google sign-in
│   └── layout.tsx, page.tsx, globals.css
├── components/
│   ├── dashboard/                        # dashboard client UI
│   ├── ui/                               # shadcn/ui primitives
│   ├── providers.tsx, theme-toggle.tsx
├── lib/
│   ├── auth.ts        # NextAuth config (Google + Prisma adapter)
│   ├── google.ts      # OAuth client + token refresh
│   ├── gmail.ts       # fetch + parse messages
│   ├── ai.ts          # Gemini structured analysis
│   ├── sync.ts        # sync orchestration
│   ├── prisma.ts, labels.ts, utils.ts
└── types/
prisma/schema.prisma
```

---

## 🗄️ Data Model (Prisma)

- `User`, `Account`, `Session`, `VerificationToken` — Auth.js.
- `Email` — subject, sender, receivedAt, preview, body, attachmentCount, isRead
  (`@@unique([userId, gmailId])` prevents duplicates on incremental sync).
- `Analysis` — summary, priority, category, requiresAction, suggestedAction,
  deadline (1:1 with Email).
- `SyncState` — per-user last sync timestamp / Gmail historyId.

Enums: `Priority`, `Category`, `Action`, `Deadline`.

---

## ▲ Deploy to Vercel

1. Push to GitHub, import into Vercel.
2. Add all env vars from `.env` (use the **pooler** `DATABASE_URL` for runtime,
   keep `DIRECT_URL` as the direct/pooler `:5432` for migrations).
3. Set `NEXTAUTH_URL` / `AUTH_URL` to your Vercel URL.
4. Add the production redirect URI in Google Cloud.
5. Run `npm run db:push` against Supabase (locally or via CI) before first use.

---

## 🔐 Security Notes

- Tokens are stored in the `Account` table (Prisma adapter). Access tokens are
  refreshed automatically via the stored refresh token (`src/lib/google.ts`).
- All API routes require an authenticated session and scope queries to the
  signed-in user.
- Never commit `.env`. Rotate any secret that has been shared in plain text.

---

## 🚫 Out of MVP Scope

AI reply, email sending, calendar, Teams, attachment analysis, task creation,
ERP/KPI integration, executive copilot.
