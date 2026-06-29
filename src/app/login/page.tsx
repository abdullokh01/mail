"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/logo";
import { ShieldCheck, Sparkles, Mail, Key, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (!res || res.error) {
        toast.error("Invalid email or password", {
          description: "Please check your credentials and try again.",
        });
      } else {
        toast.success("Welcome back!", {
          description: "Redirecting to your dashboard...",
        });
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* subtle gold ambiance */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <LogoMark className="h-14" />
            <div className="space-y-1.5">
              <p className="text-lg font-semibold tracking-[0.18em]">AURUM MAIL</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-bold">
                Smart Inbox
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            AI-powered executive email triage. Log in to access your decision center.
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@aggroup.uz"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          <div className="grid w-full grid-cols-1 gap-3 border-t pt-5 text-left text-[11px] text-muted-foreground">
            <Feature
              icon={<Mail className="h-4 w-4" />}
              text="Fetches your latest IMAP mail folders."
            />
            <Feature
              icon={<Sparkles className="h-4 w-4" />}
              text="AI summarizes, prioritizes & categorizes each email."
            />
            <Feature
              icon={<ShieldCheck className="h-4 w-4" />}
              text="Role-based access controls keep your data secure."
            />
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          by Aurum Global Group
        </p>
      </div>
    </main>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-gold">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
