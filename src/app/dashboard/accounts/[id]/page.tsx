"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getAccount, updateAccount, getProjects, getOpportunities,
  ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS,
} from "@/lib/firestore";
import type { Account, AccountType, Project, Opportunity } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, Briefcase, FileText,
  Pencil, X, Check, Building2, FolderKanban, Layers,
  DollarSign, Clock,
} from "lucide-react";
import { formatDate } from "@/lib/date";

const glass = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.8)",
  boxShadow: "0 4px 32px rgba(99,102,241,0.06), 0 1px 4px rgba(0,0,0,0.04)",
} as React.CSSProperties;

const TYPE_GRADIENTS: Record<AccountType, string> = {
  customer: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  prospect: "linear-gradient(135deg, #3b82f6, #06b6d4)",
  partner:  "linear-gradient(135deg, #8b5cf6, #7c3aed)",
  vendor:   "linear-gradient(135deg, #10b981, #14b8a6)",
  other:    "linear-gradient(135deg, #94a3b8, #64748b)",
};

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "rgba(99,102,241,0.08)" }}>
        <Icon className="w-3.5 h-3.5 text-indigo-500" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-slate-700 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [account, setAccount]     = useState<Account | null>(null);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [opps, setOpps]           = useState<Opportunity[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);

  const [form, setForm] = useState({
    name: "", type: "customer" as AccountType,
    phone: "", email: "", website: "", industry: "", address: "", notes: "",
  });

  useEffect(() => {
    Promise.all([
      getAccount(id),
      getProjects(id),
      getOpportunities(),
    ]).then(([acc, projs, allOpps]) => {
      setAccount(acc);
      setProjects(projs);
      setOpps(allOpps.filter((o) => o.accountId === id));
      if (acc) {
        setForm({
          name:     acc.name,
          type:     acc.type ?? "customer",
          phone:    acc.phone ?? "",
          email:    acc.email ?? "",
          website:  acc.website ?? "",
          industry: acc.industry ?? "",
          address:  acc.address ?? "",
          notes:    acc.notes ?? "",
        });
      }
      setLoading(false);
    });
  }, [id]);

  function set(field: string, value: string | null) {
    setForm((f) => ({ ...f, [field]: value ?? "" }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await updateAccount(id, {
        name:     form.name.trim(),
        type:     form.type,
        phone:    form.phone || undefined,
        email:    form.email || undefined,
        website:  form.website || undefined,
        industry: form.industry || undefined,
        address:  form.address || undefined,
        notes:    form.notes || undefined,
      });
      setAccount((a) => a ? { ...a, ...form } : a);
      toast.success("Account updated");
      setEditing(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (!account) return;
    setForm({
      name:     account.name,
      type:     account.type ?? "customer",
      phone:    account.phone ?? "",
      email:    account.email ?? "",
      website:  account.website ?? "",
      industry: account.industry ?? "",
      address:  account.address ?? "",
      notes:    account.notes ?? "",
    });
    setEditing(false);
  }

  /* ── Skeleton ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-5 w-32 bg-white/50 rounded-full animate-pulse" />
        <div className="h-44 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.4)" }} />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.4)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!account) return <div className="p-6 text-sm text-slate-400">Account not found.</div>;

  const t          = account.type ?? "other";
  const typeColor  = ACCOUNT_TYPE_COLORS[t];
  const initials   = account.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const activeOpps = opps.filter((o) => !["closed_won", "closed_lost"].includes(o.stage));
  const wonValue   = opps.filter((o) => o.stage === "closed_won").reduce((s, o) => s + (o.value ?? 0), 0);

  return (
    <div className="p-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to accounts
      </button>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 8px 48px rgba(99,102,241,0.18), 0 2px 8px rgba(0,0,0,0.1)" }}>
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #07091c 0%, #0f1245 50%, #120a35 100%)" }} />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)" }} />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }} />

        <div className="relative px-7 py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-extrabold shrink-0 shadow-xl"
                style={{ background: TYPE_GRADIENTS[t] }}>
                {initials}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-1">Account</p>
                <h1 className="text-2xl font-extrabold text-white leading-tight">{account.name}</h1>
                {account.industry && (
                  <p className="text-sm text-white/50 mt-0.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> {account.industry}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${typeColor.bg} ${typeColor.text} ${typeColor.border} border`}>
                {ACCOUNT_TYPE_LABELS[t]}
              </span>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white/70 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6 pt-5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {[
              { icon: Layers,       label: "Projects",    value: String(projects.length)  },
              { icon: FolderKanban, label: "Open deals",  value: String(activeOpps.length) },
              { icon: DollarSign,   label: "Won value",   value: `$${wonValue.toLocaleString()}` },
              { icon: Clock,        label: "Created",     value: account.createdAt ? formatDate(account.createdAt.toDate()) : "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Icon className="w-3.5 h-3.5 text-indigo-300" />
                <div>
                  <p className="text-[10px] text-white/40 leading-none">{label}</p>
                  <p className="text-sm font-bold text-white mt-0.5 leading-none">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left: details / edit ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {editing ? (
            /* ── Edit form ────────────────────────────────────────── */
            <div className="rounded-2xl overflow-hidden" style={glass}>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
                <h2 className="text-sm font-bold text-slate-800">Edit account</h2>
                <div className="flex items-center gap-2">
                  <button onClick={cancelEdit}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)" }}>
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    <Check className="w-3 h-3" />
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Account name <span className="text-indigo-500">*</span>
                  </Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)}
                    className="h-10 bg-white/60 border-indigo-100 focus:border-indigo-300" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Account type</Label>
                  <Select value={form.type} onValueChange={(v) => set("type", v)}>
                    <SelectTrigger className="h-10 bg-white/60 border-indigo-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Industry</Label>
                  <Input value={form.industry} onChange={(e) => set("industry", e.target.value)}
                    placeholder="e.g. Solar energy"
                    className="h-10 bg-white/60 border-indigo-100 focus:border-indigo-300" />
                </div>

                {[
                  { field: "phone",   label: "Phone",   placeholder: "+1 555 000 0000",      icon: Phone   },
                  { field: "email",   label: "Email",   placeholder: "hello@company.com",     icon: Mail    },
                  { field: "website", label: "Website", placeholder: "https://company.com",   icon: Globe   },
                  { field: "address", label: "Address", placeholder: "123 Main St, City",     icon: MapPin  },
                ].map(({ field, label, placeholder, icon: Icon }) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</Label>
                    <div className="relative">
                      <Icon className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        value={form[field as keyof typeof form]}
                        onChange={(e) => set(field, e.target.value)}
                        placeholder={placeholder}
                        className="pl-9 h-10 bg-white/60 border-indigo-100 focus:border-indigo-300"
                      />
                    </div>
                  </div>
                ))}

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notes</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)}
                    className="bg-white/60 border-indigo-100 focus:border-indigo-300 resize-none text-sm"
                    placeholder="Anything worth noting…" />
                </div>
              </div>
            </div>
          ) : (
            /* ── View mode ───────────────────────────────────────── */
            <>
              <div className="rounded-2xl overflow-hidden" style={glass}>
                <div className="px-5 py-4"
                  style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
                  <h2 className="text-sm font-bold text-slate-800">Contact information</h2>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow icon={Phone}    label="Phone"    value={account.phone} />
                  <InfoRow icon={Mail}     label="Email"    value={account.email} />
                  <InfoRow icon={Globe}    label="Website"  value={account.website} />
                  <InfoRow icon={MapPin}   label="Address"  value={account.address} />
                  <InfoRow icon={Briefcase} label="Industry" value={account.industry} />
                  {!account.phone && !account.email && !account.website && !account.address && !account.industry && (
                    <p className="sm:col-span-2 text-sm text-slate-400 italic">
                      No contact info — <button onClick={() => setEditing(true)} className="text-indigo-500 font-semibold hover:underline">add details</button>
                    </p>
                  )}
                </div>
              </div>

              {account.notes && (
                <div className="rounded-2xl overflow-hidden" style={glass}>
                  <div className="px-5 py-4 flex items-center gap-2.5"
                    style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.08)" }}>
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-800">Notes</h2>
                  </div>
                  <p className="px-5 py-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {account.notes}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Linked projects ──────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={glass}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.08)" }}>
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Projects</h2>
              </div>
              <span className="text-xs font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                {projects.length}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {projects.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">No projects yet</p>
              ) : projects.map((p) => (
                <a key={p.id} href={`/dashboard/projects/${p.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:text-indigo-600"
                  style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.08)" }}>
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.currentStage}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: opportunities ─────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={glass}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.08)" }}>
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Deals</h2>
              </div>
              <span className="text-xs font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                {opps.length}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {opps.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">No deals linked</p>
              ) : opps.map((o) => (
                <a key={o.id} href={`/dashboard/pipeline/${o.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:text-indigo-600"
                  style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.08)" }}>
                  <DollarSign className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">${(o.value ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 capitalize">{o.stage.replace("_", " ")}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="rounded-2xl overflow-hidden" style={glass}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
              <h2 className="text-sm font-bold text-slate-800">Record info</h2>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: "Created",     value: account.createdAt ? formatDate(account.createdAt.toDate()) : "—" },
                { label: "Last updated", value: account.updatedAt ? formatDate(account.updatedAt.toDate()) : "—" },
                { label: "Account ID",  value: account.id },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-medium text-slate-600 mt-0.5 break-all">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {!editing && (
            <Button
              onClick={() => setEditing(true)}
              className="w-full h-10 text-white font-semibold rounded-xl shadow-md shadow-indigo-400/20"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none" }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit account
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
