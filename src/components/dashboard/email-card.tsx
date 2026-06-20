"use client";

import Link from "next/link";
import { Paperclip, CornerUpLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  actionLabel,
  priorityAccent,
  priorityClasses,
  priorityLabel,
} from "@/lib/labels";
import type { EmailDTO } from "@/types/email";

interface Props {
  email: EmailDTO;
}

export function EmailCard({ email }: Props) {
  const a = email.analysis;
  const unread = !email.isRead;
  const replied = !!email.repliedAt;
  const initials = email.sender
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link href={`/emails/${email.id}`} className="block w-full text-left">
      <Card
        className={cn(
          "relative overflow-hidden shadow-none transition-all hover:border-border hover:shadow-sm",
          unread
            ? "border-border/70 bg-card"
            : "border-transparent bg-muted/40" // read = recessed
        )}
      >
        {/* priority accent edge (dimmed once read) */}
        {a && (
          <span
            className={cn(
              "absolute inset-y-0 left-0 w-1",
              priorityAccent[a.priority],
              !unread && "opacity-40"
            )}
          />
        )}

        <CardContent className="p-4 pl-5">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                unread
                  ? "bg-gold/15 text-gold"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {initials || "?"}
              {replied && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-background">
                  <CornerUpLeft className="h-2.5 w-2.5" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {unread && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />
                  )}
                  <p
                    className={cn(
                      "truncate text-sm",
                      unread
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    {email.sender}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(email.receivedAt)}
                </span>
              </div>

              <p
                className={cn(
                  "mt-0.5 truncate text-sm",
                  unread
                    ? "font-semibold text-foreground"
                    : "font-normal text-muted-foreground"
                )}
              >
                {email.subject}
              </p>

              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {a?.summary || email.preview}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {a && (
                  <Badge
                    variant="outline"
                    className={cn("border", priorityClasses[a.priority])}
                  >
                    {priorityLabel[a.priority]}
                  </Badge>
                )}
                {a && (
                  <Badge variant="secondary">
                    {actionLabel[a.suggestedAction]}
                  </Badge>
                )}
                {replied && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
                  >
                    <CornerUpLeft className="h-3 w-3" />
                    Replied
                  </Badge>
                )}
                {email.attachmentCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    {email.attachmentCount}
                  </span>
                )}
                {!a && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Not analyzed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
