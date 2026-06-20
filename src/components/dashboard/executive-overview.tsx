"use client";

import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Stamp,
  CalendarClock,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  deadlineLabel,
  priorityAccent,
  priorityLabel,
} from "@/lib/labels";
import type { EmailDTO, InsightStats } from "@/types/email";

interface Props {
  brief: string[];
  attention: EmailDTO[];
  insights: InsightStats;
}

const metrics = [
  { key: "approvals", label: "Approvals", icon: Stamp },
  { key: "dueToday", label: "Due Today", icon: CalendarClock },
  { key: "handledToday", label: "Handled Today", icon: Send },
] as const;

export function ExecutiveOverview({ brief, attention, insights }: Props) {
  const caughtUp = attention.length === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Executive Brief */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-gold" />
            Today&apos;s Brief
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {brief.map((line, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span className="text-foreground/90">{line}</span>
              </li>
            ))}
          </ul>

          {/* insight metrics */}
          <div className="grid grid-cols-3 gap-2 border-t pt-4">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.key} className="rounded-lg bg-muted/50 p-2.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[11px] uppercase tracking-wide">
                      {m.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {insights[m.key]}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Needs your attention */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gold" />
              Needs your attention
            </span>
            {!caughtUp && (
              <span className="text-xs font-normal text-muted-foreground">
                {attention.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caughtUp ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground">
                Nothing urgent needs you right now.
              </p>
            </div>
          ) : (
            <ul className="-my-1 divide-y">
              {attention.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/emails/${e.id}`}
                    className="group flex items-center gap-3 py-2.5"
                  >
                    <span
                      className={cn(
                        "h-8 w-1 shrink-0 rounded-full",
                        e.analysis
                          ? priorityAccent[e.analysis.priority]
                          : "bg-border"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {e.subject}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.sender}
                      </p>
                    </div>
                    {e.analysis && (
                      <div className="flex shrink-0 items-center gap-2">
                        {e.analysis.deadline !== "NONE" && (
                          <Badge variant="secondary" className="text-[10px]">
                            {deadlineLabel[e.analysis.deadline]}
                          </Badge>
                        )}
                        <span className="hidden text-[10px] uppercase tracking-wide text-muted-foreground sm:inline">
                          {priorityLabel[e.analysis.priority]}
                        </span>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
