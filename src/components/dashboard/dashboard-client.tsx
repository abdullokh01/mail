"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { StatCards, type FilterKey } from "@/components/dashboard/stat-cards";
import { ExecutiveOverview } from "@/components/dashboard/executive-overview";
import { EmailCard } from "@/components/dashboard/email-card";
import { UserMenu } from "@/components/dashboard/user-menu";
import { formatRelativeTime } from "@/lib/utils";
import type {
  DashboardStats,
  EmailDTO,
  InsightStats,
} from "@/types/email";

interface Props {
  user: { name: string; email: string; image: string | null };
  initialEmails: EmailDTO[];
  stats: DashboardStats;
  insights: InsightStats;
  brief: string[];
  attention: EmailDTO[];
  lastSyncedAt: string | null;
}

export function DashboardClient({
  user,
  initialEmails,
  stats,
  insights,
  brief,
  attention,
  lastSyncedAt,
}: Props) {
  const router = useRouter();
  const [emails, setEmails] = useState<EmailDTO[]>(initialEmails);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitial = useRef(true);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const fetchEmails = useCallback(
    async (q: string, f: FilterKey | null) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (f) params.set("filter", f);
        const res = await fetch(`/api/emails?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load emails");
        const data = await res.json();
        setEmails(data.emails);
      } catch {
        toast.error("Could not load emails");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search + filter changes.
  useEffect(() => {
    // Skip the very first render — we already have initialEmails from the
    // server, so re-fetching on mount is a wasted round-trip.
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      fetchEmails(query, filter);
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter]);

  // Ignore = mark read + reviewed locally; recedes the card and drops it from
  // the attention list. Optimistic, with a server refresh for the stat cards.
  const handleIgnore = useCallback(
    async (id: string) => {
      setEmails((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, isRead: true, reviewedAt: new Date().toISOString() }
            : e
        )
      );
      try {
        const res = await fetch(`/api/emails/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true, reviewed: true }),
        });
        if (!res.ok) throw new Error("Failed");
        router.refresh(); // refresh server stats + attention
      } catch {
        toast.error("Could not ignore email");
        await fetchEmails(query, filter); // re-sync on failure
      }
    },
    [router, fetchEmails, query, filter]
  );

  const handleSync = async () => {
    setSyncing(true);
    toast.info("Syncing inbox…", { description: "Fetching latest emails" });
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      toast.success("Sync complete", {
        description: `${data.created} new email(s), ${data.analyzed} analyzed.`,
      });
      await fetchEmails(query, filter);
      router.refresh(); // refresh server stats
    } catch (err) {
      toast.error("Sync failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Logo />
          <div className="hidden flex-1 sm:block" />

          <div className="flex items-center gap-2">
            <Button onClick={handleSync} disabled={syncing} size="sm">
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Sync Inbox</span>
            </Button>
            <ThemeToggle />
            <UserMenu {...user} />
          </div>
        </div>
      </header>

      <main className="container space-y-8 py-8">
        {/* Today's summary */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {today}
          </p>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="h-7 w-1 rounded-full bg-gold" />
            Good day, {user.name.split(" ")[0]}.
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.total === 0
              ? "No emails yet — hit “Sync Inbox” to pull your inbox."
              : `You have ${stats.critical.needsReview} critical and ${stats.reply.needsReview} email(s) needing a reply.`}
            {lastSyncedAt && (
              <span className="ml-1">
                Last synced {formatRelativeTime(lastSyncedAt)}.
              </span>
            )}
          </p>
        </div>

        {/* Stat cards */}
        <StatCards stats={stats} active={filter} onSelect={setFilter} />

        {/* Executive overview: brief + attention */}
        {stats.total > 0 && (
          <ExecutiveOverview
            brief={brief}
            attention={attention}
            insights={insights}
          />
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject, sender, or keyword…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {filter ? "Filtered Emails" : "Recent Emails"}
            </h2>
            <span className="text-xs text-muted-foreground">
              {loading ? "" : `${emails.length} shown`}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No emails found</p>
              <p className="text-sm text-muted-foreground">
                {query || filter
                  ? "Try a different search or filter."
                  : "Sync your inbox to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  onIgnore={handleIgnore}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
