"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  ArrowLeft, Loader2, Plus, Edit2, Trash2, Shield, User, Key, Mail, CheckCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogoMark } from "@/components/logo";

interface UserDTO {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "MANAGER";
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [saving, setSaving] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      toast.error("Access denied. Admin role required.");
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      toast.error("Failed to load user list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role === "ADMIN") {
      loadUsers();
    }
  }, [session, status]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("MANAGER");
    setDialogOpen(true);
  };

  const handleOpenEdit = (user: UserDTO) => {
    setEditingUser(user);
    setName(user.name || "");
    setEmail(user.email);
    setPassword(""); // Keep blank to not change password
    setRole(user.role);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      toast.success("User deleted successfully");
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingUser ? "PUT" : "POST";
      const payload = {
        id: editingUser?.id,
        name,
        email,
        password: password || undefined,
        role,
      };

      const res = await fetch("/api/admin/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save user");

      toast.success(editingUser ? "User updated" : "User created successfully");
      setDialogOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  // Double check authorization to prevent flash of content
  if ((session?.user as any)?.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background p-6 md:p-12 overflow-y-auto">
      {/* subtle gold ambiance */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      <div className="mx-auto w-full max-w-4xl space-y-6">
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
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">ADMIN PANEL</span>
          </div>
        </div>

        {/* User List Card */}
        <Card className="border border-border/80 bg-card/50 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">System Users</CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage managers and administrators configured to use the platform.
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-border/60">
                <User className="h-10 w-10 text-muted-foreground opacity-50 mb-3" />
                <p className="font-medium text-sm">No users registered</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add User" to create a new manager or admin.</p>
              </div>
            ) : (
              <div className="relative overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-accent/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-6 py-4">Name</th>
                      <th scope="col" className="px-6 py-4">Email</th>
                      <th scope="col" className="px-6 py-4">Role</th>
                      <th scope="col" className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-accent/20 transition-colors">
                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                          {user.name || <span className="italic text-muted-foreground">None</span>}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                        <td className="px-6 py-4">
                          <span 
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${
                              user.role === "ADMIN" 
                                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                : "bg-gold/10 text-gold border-gold/20"
                            }`}
                          >
                            {user.role === "ADMIN" && <Shield className="h-3 w-3" />}
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(user)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-red-400"
                              disabled={user.id === session?.user?.id}
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border border-border/80 bg-card backdrop-blur-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User Account" : "Create User Account"}</DialogTitle>
              <DialogDescription>
                Fill in the email, role, and password. For managers, they will use these credentials to log in.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="dlg-name" className="text-sm font-medium leading-none">Full Name</label>
                <Input
                  id="dlg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="dlg-email" className="text-sm font-medium leading-none">Email Address</label>
                <Input
                  id="dlg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aggroup.uz"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="dlg-password" className="text-sm font-medium leading-none">
                  Password {editingUser && <span className="text-xs text-muted-foreground">(leave blank to keep existing)</span>}
                </label>
                <Input
                  id="dlg-password"
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? "••••••••" : "Password"}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="dlg-role" className="text-sm font-medium leading-none">User Role</label>
                <select
                  id="dlg-role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="MANAGER">MANAGER (Standard Access)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-4">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save User"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
