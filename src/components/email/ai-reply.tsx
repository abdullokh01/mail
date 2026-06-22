"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Copy, RefreshCw, Send, Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props {
  emailId: string;
  recipient: string | null;
  /** Called after a reply is successfully sent (e.g. to refresh the thread). */
  onSent?: () => void;
}

const STYLES: { value: string; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "short", label: "Short" },
  { value: "friendly", label: "Friendly" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "request_info", label: "Request Info" },
];

export function AiReply({ emailId, recipient, onSent }: Props) {
  const [style, setStyle] = useState("professional");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [started, setStarted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/emails/${emailId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsReauth) {
          toast.error("Send permission needed", {
            description: "Re-authenticating to grant Gmail send access…",
          });
          setTimeout(
            () => signIn("google", { redirectTo: `/emails/${emailId}` }),
            1200
          );
          return;
        }
        throw new Error(data.error || "Failed to send");
      }
      toast.success("Reply sent", {
        description: recipient ? `Sent to ${recipient}` : undefined,
      });
      setConfirmOpen(false);
      onSent?.();
    } catch (err) {
      toast.error("Could not send reply", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSending(false);
    }
  };

  const generate = async (selectedStyle: string) => {
    setLoading(true);
    setStarted(true);
    try {
      const res = await fetch(`/api/emails/${emailId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: selectedStyle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate reply");
      setReply(data.reply);
      toast.success("Reply generated");
    } catch (err) {
      toast.error("Could not generate reply", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(reply);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-gold" />
          AI Reply
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Style selector */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Reply style
          </p>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStyle(s.value)}
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                  style === s.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-accent"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {!started ? (
          <Button onClick={() => generate(style)} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate AI Reply
          </Button>
        ) : (
          <>
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Generated reply will appear here…"
                className="min-h-[200px]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copy}
                disabled={!reply || loading}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generate(style)}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={!reply || loading || !recipient}
                title={
                  recipient
                    ? `Send to ${recipient}`
                    : "No recipient address available"
                }
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {recipient
                ? `Send delivers this reply to ${recipient} via Gmail.`
                : "No recipient address — copy the reply to send it manually."}
            </p>
          </>
        )}
      </CardContent>

      {/* Send confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send this reply?</DialogTitle>
            <DialogDescription>
              This will send the email to{" "}
              <span className="font-medium text-foreground">{recipient}</span>{" "}
              from your Gmail account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            {reply}
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" disabled={sending}>
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" onClick={send} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
