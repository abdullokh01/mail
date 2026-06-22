"use client";

import { useCallback, useEffect, useState } from "react";
import { MessagesSquare, Loader2, CornerUpLeft, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ThreadMessage {
  id: string;
  from: { name: string; email: string | null };
  date: string;
  isFromMe: boolean;
  isCurrent: boolean;
  html: string | null;
  text: string;
  attachmentCount: number;
}

interface Props {
  emailId: string;
  /** Bump to force a refetch (e.g. right after sending a reply). */
  refreshKey?: number;
}

export function ConversationThread({ emailId, refreshKey = 0 }: Props) {
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/emails/${emailId}/thread`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load conversation");
      setMessages(data.messages as ThreadMessage[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [emailId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // The "Original Email" card already shows the focused message — here we only
  // surface the rest of the conversation: replies you sent and replies back.
  const replies = (messages ?? []).filter((m) => !m.isCurrent);

  if (loading && messages === null) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessagesSquare className="h-4 w-4 text-gold" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading conversation…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessagesSquare className="h-4 w-4 text-gold" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessagesSquare className="h-4 w-4 text-gold" />
          Conversation
          {replies.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({replies.length} {replies.length === 1 ? "reply" : "replies"})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No replies in this thread yet. Sent replies and responses will appear
            here.
          </p>
        ) : (
          replies.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-lg border p-4",
                m.isFromMe ? "border-gold/40 bg-gold/5" : "bg-muted/30"
              )}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  {m.isFromMe ? (
                    <Badge className="gap-1">
                      <CornerUpLeft className="h-3 w-3" />
                      You
                    </Badge>
                  ) : (
                    <span className="font-medium">{m.from.name}</span>
                  )}
                  {!m.isFromMe && m.from.email && (
                    <span className="text-xs text-muted-foreground">
                      {m.from.email}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.date).toLocaleString()}
                </span>
              </div>

              {m.html ? (
                <div
                  className="email-body max-w-none break-words text-sm"
                  dangerouslySetInnerHTML={{ __html: m.html }}
                />
              ) : (
                <pre className="whitespace-pre-wrap break-words font-sans text-sm text-muted-foreground">
                  {m.text || "(empty message)"}
                </pre>
              )}

              {m.attachmentCount > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  {m.attachmentCount} attachment(s)
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
