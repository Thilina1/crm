"use client";

import { useState } from "react";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, UserCog, User, KeyRound, Eye, EyeOff } from "lucide-react";

const ROLE_CONFIG = {
  admin:    { label: "Admin",        icon: ShieldCheck, bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  gradient: "from-violet-500 to-purple-600"  },
  rep:      { label: "Rep",          icon: UserCog,     bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    gradient: "from-blue-500 to-indigo-500"    },
  customer: { label: "Project User", icon: User,        bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", gradient: "from-emerald-500 to-teal-400"   },
};

function PasswordInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••"}
        className="h-10 bg-white border-slate-200 text-slate-900 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { appUser, firebaseUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving]                   = useState(false);

  const cfg = ROLE_CONFIG[appUser?.role ?? "rep"];
  const RoleIcon = cfg.icon;
  const initials = appUser?.name
    ? appUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  async function handleChangePassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newPassword) { toast.error("New password is required"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (!firebaseUser?.email) { toast.error("No authenticated user"); return; }

    setSaving(true);
    try {
      // Re-authenticate first so Firebase doesn't reject the password update
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Current password is incorrect");
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to update password");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-5">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-slate-900">{appUser?.name ?? "—"}</p>
          <p className="text-sm text-slate-400 truncate">{appUser?.email ?? "—"}</p>
          <span className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <RoleIcon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Change password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current" className="text-xs text-slate-500">Current password</Label>
            <PasswordInput id="current" value={currentPassword} onChange={setCurrentPassword} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new" className="text-xs text-slate-500">New password</Label>
            <PasswordInput id="new" value={newPassword} onChange={setNewPassword} placeholder="Min. 6 characters" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-xs text-slate-500">Confirm new password</Label>
            <PasswordInput id="confirm" value={confirmPassword} onChange={setConfirmPassword} />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {saving ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
