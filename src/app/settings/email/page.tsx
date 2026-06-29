"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle, Server, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogoMark } from "@/components/logo";

export default function EmailSettingsPage() {
  const router = useRouter();
  
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "Success" | "Authentication failed" | "Server unavailable" | null;
    error?: string;
  }>({ status: null });

  // Fetch existing settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/email/test");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        
        setImapHost(data.imapHost || "");
        setImapPort(data.imapPort || "");
        setSmtpHost(data.smtpHost || "");
        setSmtpPort(data.smtpPort || "");
        setEmail(data.email || "");
        if (data.hasPassword) {
          setPassword("••••••••");
        }
      } catch (err) {
        toast.error("Failed to load current email settings");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult({ status: null });
    
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imapHost,
          imapPort,
          smtpHost,
          smtpPort,
          email,
          password,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Connection test failed");
      }
      
      setTestResult({
        status: data.status,
        error: data.error,
      });

      if (data.status === "Success") {
        toast.success("Connection test passed!");
      } else if (data.status === "Authentication failed") {
        toast.error("Authentication failed. Please verify credentials.");
      } else {
        toast.error("Server unavailable. Check hosts and ports.");
      }
    } catch (err: any) {
      setTestResult({
        status: "Server unavailable",
        error: err.message,
      });
      toast.error(err.message || "Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background p-6 md:p-12 overflow-y-auto">
      {/* subtle gold ambiance */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="flex items-center gap-2 hover:bg-accent"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">AURUM MAIL</span>
          </div>
        </div>

        <Card className="border border-border/80 bg-card/50 backdrop-blur-md shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Email Connection Settings</CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure and test credentials for connection to the active IMAP/SMTP provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTestConnection} className="space-y-6">
              {/* Credentials Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gold/80">Account Credentials</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium leading-none">Email Address</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium leading-none">Password</label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <hr className="border-border/55" />

              {/* IMAP Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gold/80 flex items-center gap-2">
                  <Server className="h-4 w-4" /> IMAP Settings (Incoming)
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="space-y-2 md:col-span-3">
                    <label htmlFor="imapHost" className="text-sm font-medium leading-none">IMAP Host</label>
                    <Input
                      id="imapHost"
                      placeholder="mail.example.com"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="imapPort" className="text-sm font-medium leading-none">IMAP Port</label>
                    <Input
                      id="imapPort"
                      placeholder="993"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <hr className="border-border/55" />

              {/* SMTP Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gold/80 flex items-center gap-2">
                  <Server className="h-4 w-4" /> SMTP Settings (Outgoing)
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="space-y-2 md:col-span-3">
                    <label htmlFor="smtpHost" className="text-sm font-medium leading-none">SMTP Host</label>
                    <Input
                      id="smtpHost"
                      placeholder="mail.example.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="smtpPort" className="text-sm font-medium leading-none">SMTP Port</label>
                    <Input
                      id="smtpPort"
                      placeholder="465"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-4">
                <Button type="submit" size="lg" className="w-full relative overflow-hidden" disabled={testing}>
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                {/* Connection Status Box */}
                {testResult.status && (
                  <div
                    className={`flex items-start gap-3 rounded-lg border p-4 ${
                      testResult.status === "Success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : testResult.status === "Authentication failed"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {testResult.status === "Success" ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                    ) : testResult.status === "Authentication failed" ? (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-red-400" />
                    )}
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm">
                        Result: {testResult.status}
                      </h4>
                      {testResult.error && (
                        <p className="text-xs opacity-80 break-all">{testResult.error}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
