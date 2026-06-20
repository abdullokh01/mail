import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { ShieldCheck, Sparkles, Mail } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* subtle gold ambiance */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-8 rounded-2xl border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <LogoMark className="h-14" />
            <div className="space-y-1.5">
              <p className="text-lg font-semibold tracking-[0.18em]">B-POINT</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Executive Decision Center
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            AI-powered email triage. Instantly see which emails need your
            attention.
          </p>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
            className="w-full"
          >
            <Button type="submit" className="w-full" size="lg">
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>

          <div className="grid w-full grid-cols-1 gap-3 border-t pt-5 text-left text-xs text-muted-foreground">
            <Feature
              icon={<Mail className="h-4 w-4" />}
              text="Reads your latest Gmail messages."
            />
            <Feature
              icon={<Sparkles className="h-4 w-4" />}
              text="AI summarizes, prioritizes & categorizes each email."
            />
            <Feature
              icon={<ShieldCheck className="h-4 w-4" />}
              text="Read-only by default — you stay in control."
            />
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1H12v3.83h5.34c-.23 1.4-1.62 4.1-5.34 4.1-3.21 0-5.83-2.66-5.83-5.93S8.79 7.17 12 7.17c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.69 4.6 14.55 3.7 12 3.7 6.92 3.7 2.8 7.82 2.8 12.9S6.92 22.1 12 22.1c5.27 0 8.76-3.7 8.76-8.92 0-.6-.07-1.06-.16-1.52z"
      />
    </svg>
  );
}
