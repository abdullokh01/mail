"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Paperclip,
  Download,
  RefreshCw,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { AiReply } from "@/components/email/ai-reply";
import { cn, formatBytes } from "@/lib/utils";
import {
  actionLabel,
  categoryLabel,
  deadlineLabel,
  priorityClasses,
  priorityLabel,
} from "@/lib/labels";
import type { EmailDTO, EmailAttachmentDTO } from "@/types/email";

interface Props {
  email: EmailDTO;
  safeBodyHtml: string | null;
  userName: string;
}

export function EmailDetailView({ email, safeBodyHtml, userName }: Props) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const a = email.analysis;
  const attachments = (email.attachments ?? []) as EmailAttachmentDTO[];
  const safeHtml = safeBodyHtml;

  const refreshAnalysis = async () => {
    setRefreshing(true);
    toast.info("Refreshing AI analysis…");
    try {
      const res = await fetch(`/api/emails/${email.id}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh");
      toast.success("AI analysis updated");
      router.refresh();
    } catch (err) {
      toast.error("Could not refresh analysis", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAnalysis}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Refresh AI Analysis</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-4xl space-y-6 py-6">
        {/* Email header */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {email.subject}
          </h1>
          <p className="text-sm font-medium">
            {email.sender}
            {email.senderEmail && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {email.senderEmail}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(email.receivedAt).toLocaleString()}
          </p>
        </div>

        {/* AI Analysis Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-gold" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {a ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn("border", priorityClasses[a.priority])}
                  >
                    {priorityLabel[a.priority]}
                  </Badge>
                  <Badge variant="secondary">{categoryLabel[a.category]}</Badge>
                  <Badge variant="secondary">
                    Action: {actionLabel[a.suggestedAction]}
                  </Badge>
                  <Badge variant="outline">
                    {a.requiresAction ? "Requires action" : "No action needed"}
                  </Badge>
                  {a.deadline !== "NONE" && (
                    <Badge>{deadlineLabel[a.deadline]}</Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">Summary</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.summary}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No analysis yet. Click “Refresh AI Analysis”.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Original Email */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Original Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {safeHtml ? (
              <div
                className="email-body max-w-none break-words text-sm"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-muted-foreground">
                {email.body || email.preview || "(empty body)"}
              </pre>
            )}

            {attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({attachments.length})
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {attachments.map((att) => (
                      <a
                        key={att.attachmentId}
                        href={`/api/emails/${email.id}/attachments/${att.attachmentId}`}
                        className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {att.filename}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatBytes(att.size)}
                        </span>
                        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {attachments.length === 0 && email.attachmentCount > 0 && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  {email.attachmentCount} attachment(s) — click “Refresh AI
                  Analysis” to load attachment details.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI Reply generator */}
        <AiReply emailId={email.id} recipient={email.senderEmail} />

        <p className="pb-4 text-center text-xs text-muted-foreground">
          Drafting on behalf of {userName}
        </p>
      </main>
    </div>
  );
}
