"use client";

import { AlertTriangle, Flame, Reply, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types/email";

type FilterKey = "critical" | "high" | "reply" | "fyi";

interface Props {
  stats: DashboardStats;
  active: FilterKey | null;
  onSelect: (key: FilterKey | null) => void;
}

const cards: {
  key: FilterKey;
  label: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  {
    key: "critical",
    label: "Critical",
    icon: <AlertTriangle className="h-5 w-5" />,
    accent: "text-red-600 dark:text-red-400",
  },
  {
    key: "high",
    label: "High Priority",
    icon: <Flame className="h-5 w-5" />,
    accent: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "reply",
    label: "Need Reply",
    icon: <Reply className="h-5 w-5" />,
    accent: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "fyi",
    label: "FYI",
    icon: <Inbox className="h-5 w-5" />,
    accent: "text-slate-600 dark:text-slate-400",
  },
];

export function StatCards({ stats, active, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const isActive = active === c.key;
        const b = stats[c.key];
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(isActive ? null : c.key)}
            className="group text-left focus:outline-none"
          >
            <Card
              className={cn(
                "relative overflow-hidden border-border/70 shadow-none transition-all hover:border-border hover:shadow-sm",
                isActive && "border-gold/60 ring-1 ring-gold/40"
              )}
            >
              {/* gold accent bar on the active card */}
              <span
                className={cn(
                  "absolute inset-x-0 top-0 h-0.5 bg-gold transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {c.label}
                    </p>
                    <p className="text-3xl font-semibold tabular-nums">
                      {b.total}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full bg-muted/60",
                      c.accent
                    )}
                  >
                    {c.icon}
                  </span>
                </div>

                {/* lifecycle breakdown: to review · reviewed · replied */}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                    <span className="tabular-nums">{b.needsReview}</span> to review
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    <span className="tabular-nums">{b.reviewed}</span> reviewed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="tabular-nums">{b.replied}</span> replied
                  </span>
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

export type { FilterKey };
