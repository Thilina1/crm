"use client";

import { useEffect, useState } from "react";
import { getAllUsers, getProjects, getUserByEmail } from "@/lib/firestore";
import type { AppUser, Project, UserRole } from "@/types";
import { Search, Users, ShieldCheck, UserCog, User, UserPlus, X } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { provisionAuth, provisionDb } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_CONFIG = {
  admin:    { label: "Admin",        icon: ShieldCheck, bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200"  },
  rep:      { label: "Rep",          icon: UserCog,     bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200"    },
  customer: { label: "Project User", icon: User,        bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

type RoleFilter = "all" | "admin" | "rep" | "customer";

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: (u: AppUser) => void }) {
  const [form, setForm]     = useState({ name: "", email: "", role: "rep" as "admin" | "rep" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      // Check if email already exists
      const existing = await getUserByEmail(form.email.trim());
      if (existing) { toast.error("A user with this email already exists"); return; }

      // Create Firebase Auth account via secondary app
      const cred = await createUserWithEmailAndPassword(provisionAuth, form.email.trim(), "1234567890");
      const uid = cred.user.uid;
      await updateProfile(cred.user, { displayName: form.name.trim() });

      // Write Firestore profile as the new user (provisionDb is authenticated as them)
      const profile: Omit<AppUser, "uid"> = {
        name:      form.name.trim(),
        email:     form.email.trim(),
        role:      form.role as UserRole,
        createdAt: serverTimestamp() as AppUser["createdAt"],
      };
      await setDoc(doc(provisionDb, "users", uid), profile);
      signOut(provisionAuth).catch(() => {});

      toast.success(`User created — login: ${form.email.trim()} / 1234567890`, { duration: 8000 });
      onAdded({ uid, ...profile, createdAt: Timestamp.fromDate(new Date()) });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl shadow-indigo-900/20 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add user</h2>
            <p className="text-xs text-slate-400 mt-0.5">Creates a login with default password <span className="font-mono font-semibold text-slate-600">1234567890</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Full name *</Label>
            <Input
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-9 bg-white border-slate-200 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Email *</Label>
            <Input
              type="email"
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="h-9 bg-white border-slate-200 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Role *</Label>
            <div className="flex gap-2">
              {(["rep", "admin"] as const).map((r) => {
                const cfg = ROLE_CONFIG[r];
                const RoleIcon = cfg.icon;
                const active = form.role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      active
                        ? r === "admin"
                          ? "bg-violet-50 border-violet-400 text-violet-700"
                          : "bg-blue-50 border-blue-400 text-blue-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <RoleIcon className="w-4 h-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-9">
              {saving ? "Creating…" : "Create user"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-slate-500">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const PAGE_SIZE = 10;

  const [users, setUsers]           = useState<AppUser[]>([]);
  const [projects, setProjects]     = useState<Project[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [showModal, setShowModal]   = useState(false);
  const [page, setPage]             = useState(1);

  useEffect(() => { setPage(1); }, [search, roleFilter]);

  useEffect(() => {
    Promise.all([getAllUsers(), getProjects()])
      .then(([u, p]) => { setUsers(u); setProjects(p); })
      .finally(() => setLoading(false));
  }, []);

  // Map uid → project names
  const projectsByUid: Record<string, string[]> = {};
  for (const p of projects) {
    for (const uid of p.memberUids ?? []) {
      if (!projectsByUid[uid]) projectsByUid[uid] = [];
      projectsByUid[uid].push(p.name);
    }
  }

  const filtered = users.filter((u) => {
    const matchText =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchText && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    all:      users.length,
    admin:    users.filter((u) => u.role === "admin").length,
    rep:      users.filter((u) => u.role === "rep").length,
    customer: users.filter((u) => u.role === "customer").length,
  };

  const tabStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }
      : { background: "rgba(255,255,255,0.72)", border: "1px solid rgba(99,102,241,0.12)" };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} users total</p>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:opacity-90 shadow-md shadow-indigo-400/20"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <UserPlus className="w-4 h-4" />
          Add user
        </button>
      </div>

      {/* Role filter */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "all",      label: "All",          count: counts.all      },
          { key: "admin",    label: "Admins",        count: counts.admin    },
          { key: "rep",      label: "Reps",          count: counts.rep      },
          { key: "customer", label: "Project Users", count: counts.customer },
        ] as { key: RoleFilter; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setRoleFilter(key)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              roleFilter === key ? "text-white shadow-md shadow-indigo-400/20" : "text-slate-500 hover:text-slate-700"
            }`}
            style={tabStyle(roleFilter === key)}
          >
            {label}
            <span className={`ml-1.5 text-xs ${roleFilter === key ? "text-white/70" : "text-slate-400"}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl w-full max-w-sm"
        style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(99,102,241,0.12)" }}>
        <Search className="w-4 h-4 text-indigo-400 shrink-0" />
        <input
          className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 4px 32px rgba(99,102,241,0.06)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(99,102,241,0.08)", background: "rgba(248,248,252,0.8)" }}>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Projects</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(99,102,241,0.06)" }}>
                  {[...Array(5)].map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 rounded bg-slate-100 animate-pulse" style={{ width: j === 0 ? "120px" : j === 1 ? "160px" : "80px" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-slate-200" />
                    <p className="text-sm text-slate-400">
                      {search || roleFilter !== "all" ? "No users match your filters." : "No users yet."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((user, idx) => {
                const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.rep;
                const RoleIcon = cfg.icon;
                const initials = user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                const userProjects = projectsByUid[user.uid] ?? [];
                const isLast = idx === paginated.length - 1;

                return (
                  <tr
                    key={user.uid}
                    className="transition-colors hover:bg-indigo-50/30"
                    style={!isLast ? { borderBottom: "1px solid rgba(99,102,241,0.06)" } : undefined}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                          style={{ background: user.role === "admin" ? "linear-gradient(135deg,#8b5cf6,#7c3aed)" : user.role === "rep" ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "linear-gradient(135deg,#10b981,#0d9488)" }}>
                          {initials}
                        </div>
                        <span className="font-medium text-slate-800">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{user.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        <RoleIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {userProjects.length === 0 ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {userProjects.map((name) => (
                            <span key={name} className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {user.createdAt ? formatDate(user.createdAt.toDate()) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          perPage={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onAdded={(u) => setUsers((prev) => [...prev, u])}
        />
      )}
    </div>
  );
}
