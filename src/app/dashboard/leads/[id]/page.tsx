"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  getLead, updateLead, createAccount,
  getOpportunityByLeadId, updateOpportunity, getReps,
} from "@/lib/firestore";
import type { Lead, LeadStage, LeadSource, LeadScore, AppUser } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle, Phone, Mail, MessageCircle, Zap,
  DollarSign, Tag, User, Pencil, X,
} from "lucide-react";
import { formatDate } from "@/lib/date";

const SOURCES: { value: LeadSource; label: string; icon: string }[] = [
  { value: "call",      label: "Mobile call",        icon: "📞" },
  { value: "whatsapp",  label: "WhatsApp",            icon: "💬" },
  { value: "web",       label: "Web form",            icon: "🌐" },
  { value: "facebook",  label: "Facebook Lead Ads",   icon: "📘" },
  { value: "import",    label: "CSV import",          icon: "📂" },
  { value: "api",       label: "API / Webhook",       icon: "⚡" },
];

const PRODUCTS = [
  "Solar installation", "Service contract", "Consultation",
  "Maintenance plan", "Software", "Marketing", "Real Estate", "Other",
];

const scorePill: Record<string, string> = {
  hot:  "bg-red-50 text-red-600 border border-red-200",
  warm: "bg-amber-50 text-amber-600 border border-amber-200",
  cold: "bg-slate-100 text-slate-500 border border-slate-200",
};

const sourceIcon: Record<string, string> = {
  call: "📞", whatsapp: "💬", web: "🌐", facebook: "📘", import: "📂", api: "⚡",
};

function scoreFromStage(stage: LeadStage, budget?: number): LeadScore {
  if (stage === "confirmed") return "hot";
  if (stage === "warm" && budget) return "warm";
  return "cold";
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-900 mt-0.5 font-medium">{value}</p>
      </div>
    </div>
  );
}

function FieldIcon({ icon: Icon }: { icon: React.ElementType }) {
  return <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const searchParams = useSearchParams();

  const [lead, setLead]         = useState<Lead | null>(null);
  const [reps, setReps]         = useState<AppUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [converting, setConverting] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);

  const [form, setForm] = useState({
    fullName: "", phone: "", whatsapp: "", email: "",
    source: "" as LeadSource, productInterest: "",
    budget: "", notes: "", assignedRep: "", stage: "cold" as LeadStage,
  });

  useEffect(() => {
    Promise.all([getLead(id), getReps()]).then(([l, r]) => {
      setLead(l);
      setReps(r);
      if (searchParams.get("edit") === "1" && l && !l.isConverted) {
        setForm({
          fullName:        l.fullName,
          phone:           l.phone,
          whatsapp:        l.whatsapp ?? "",
          email:           l.email ?? "",
          source:          l.source,
          productInterest: l.productInterest,
          budget:          l.budget != null ? String(l.budget) : "",
          notes:           l.notes ?? "",
          assignedRep:     l.assignedRep,
          stage:           l.stage === "converted" ? "confirmed" : l.stage,
        });
        setEditing(true);
      }
    }).finally(() => setLoading(false));
  }, [id]);

  function openEdit() {
    if (!lead) return;
    setForm({
      fullName:        lead.fullName,
      phone:           lead.phone,
      whatsapp:        lead.whatsapp ?? "",
      email:           lead.email ?? "",
      source:          lead.source,
      productInterest: lead.productInterest,
      budget:          lead.budget != null ? String(lead.budget) : "",
      notes:           lead.notes ?? "",
      assignedRep:     lead.assignedRep,
      stage:           lead.stage === "converted" ? "confirmed" : lead.stage,
    });
    setEditing(true);
  }

  function set(field: string, value: string | null) {
    setForm((f) => ({ ...f, [field]: value ?? "" }));
  }

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.source)          { toast.error("Please select a source"); return; }
    if (!form.productInterest) { toast.error("Please select a product"); return; }
    if (!form.assignedRep)     { toast.error("Please assign a rep"); return; }
    setSaving(true);
    try {
      const budget = form.budget ? parseFloat(form.budget) : undefined;
      const score  = scoreFromStage(form.stage, budget);
      const patch: Partial<Lead> = {
        fullName: form.fullName,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        source: form.source,
        productInterest: form.productInterest,
        budget,
        notes: form.notes || undefined,
        assignedRep: form.assignedRep,
        stage: form.stage,
        score,
      };
      await updateLead(id, patch);
      setLead((l) => l && { ...l, ...patch });
      toast.success("Lead updated");
      setEditing(false);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function changeStage(stage: LeadStage) {
    if (!lead) return;
    await updateLead(id, { stage });
    setLead((l) => l && { ...l, stage });
    toast.success("Stage updated");
  }

  async function convertLead() {
    if (!lead) return;
    setConverting(true);
    try {
      const accountId = await createAccount({
        name: lead.fullName, phone: lead.phone, email: lead.email,
        tags: [], customFields: {}, isArchived: false,
      });
      await updateLead(id, { isConverted: true, stage: "converted", convertedAccountId: accountId });
      const linkedOpp = await getOpportunityByLeadId(id);
      if (linkedOpp) await updateOpportunity(linkedOpp.id, { accountId, leadId: undefined, leadName: undefined });
      setLead((l) => l && { ...l, isConverted: true, stage: "converted", convertedAccountId: accountId });
      toast.success("Lead converted — Account created!");
      router.push(`/dashboard/accounts/${accountId}`);
    } catch {
      toast.error("Conversion failed");
    } finally {
      setConverting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!lead) return <div className="p-6 text-sm text-slate-400">Lead not found.</div>;

  const initials = lead.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const repName  = reps.find((r) => r.uid === lead.assignedRep)?.name;

  return (
    <div className="p-6 space-y-5">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to leads
        </button>
        {!editing && lead && !lead.isConverted && (
          <button
            onClick={openEdit}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit lead
          </button>
        )}
      </div>

      {editing ? (
        /* ── Edit form ── */
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Edit Lead</h2>
            <button type="button" onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contact section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-semibold text-slate-700">Contact Details</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full name *</Label>
                <div className="relative">
                  <FieldIcon icon={User} />
                  <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="pl-9 h-10 bg-white border-slate-200" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone *</Label>
                <div className="relative">
                  <FieldIcon icon={Phone} />
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="pl-9 h-10 bg-white border-slate-200" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp</Label>
                <div className="relative">
                  <FieldIcon icon={Phone} />
                  <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className="pl-9 h-10 bg-white border-slate-200" placeholder="If different from phone" />
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</Label>
                <div className="relative">
                  <FieldIcon icon={Mail} />
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="pl-9 h-10 bg-white border-slate-200" />
                </div>
              </div>
            </div>
          </div>

          {/* Lead details section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-semibold text-slate-700">Lead Details</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Source *</Label>
                <Select value={form.source} onValueChange={(v) => set("source", v)}>
                  <SelectTrigger className="h-10 bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}><span className="flex items-center gap-2">{s.icon} {s.label}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Product interest *</Label>
                <Select value={form.productInterest} onValueChange={(v) => set("productInterest", v)}>
                  <SelectTrigger className="h-10 bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Budget</Label>
                <div className="relative">
                  <FieldIcon icon={DollarSign} />
                  <Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} className="pl-9 h-10 bg-white border-slate-200" placeholder="Leave blank if unknown" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Stage *</Label>
                <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                  <SelectTrigger className="h-10 bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">❄️ Cold — no budget shared</SelectItem>
                    <SelectItem value="warm">🔥 Warm — budget shared</SelectItem>
                    <SelectItem value="confirmed">✅ Confirmed — deal agreed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Assigned rep *</Label>
                <SearchableSelect
                  value={form.assignedRep}
                  onValueChange={(v) => set("assignedRep", v)}
                  options={reps.map((r) => ({ value: r.uid, label: r.name }))}
                  placeholder="Select rep…"
                  searchPlaceholder="Search reps…"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="bg-white border-slate-200 resize-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6">
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)} className="h-10 border-slate-200 text-slate-600">
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        /* ── View mode ── */
        <>
          {/* Hero card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#0a0f1e] to-[#0f1f40] px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold text-white">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white">{lead.fullName}</h1>
                  <p className="text-sm text-white/50 mt-0.5 capitalize">
                    {sourceIcon[lead.source]} {lead.source} · {lead.productInterest}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${scorePill[lead.score]}`}>
                    {lead.score}
                  </span>
                  {lead.isConverted && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Converted
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-2">
              <DetailRow icon={Phone}       label="Phone"            value={lead.phone} />
              <DetailRow icon={MessageCircle} label="WhatsApp"       value={lead.whatsapp} />
              <DetailRow icon={Mail}        label="Email"            value={lead.email} />
              <DetailRow icon={DollarSign}  label="Budget"           value={lead.budget != null ? `$${lead.budget.toLocaleString()}` : undefined} />
              <DetailRow icon={Tag}         label="Product interest" value={lead.productInterest} />
              <DetailRow icon={User}        label="Assigned rep"     value={repName} />
              <DetailRow icon={User}        label="Created"          value={lead.createdAt ? formatDate(lead.createdAt.toDate()) : undefined} />
              {lead.notes && (
                <div className="py-3 border-b border-slate-100 last:border-0">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stage management */}
          {!lead.isConverted ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                <h2 className="text-sm font-semibold text-slate-700">Customer Stage</h2>
                <p className="text-xs text-slate-400 mt-0.5">Update after each interaction</p>
              </div>
              <div className="p-5 space-y-4">
                <Select value={lead.stage} onValueChange={(v) => changeStage(v as LeadStage)}>
                  <SelectTrigger className="w-full h-10 bg-white border-slate-200 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">❄️ Cold — no budget shared</SelectItem>
                    <SelectItem value="warm">🔥 Warm — budget shared</SelectItem>
                    <SelectItem value="confirmed">✅ Confirmed — deal agreed</SelectItem>
                  </SelectContent>
                </Select>

                {lead.stage === "confirmed" && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Ready to convert</p>
                      <p className="text-xs text-blue-600 mt-0.5">Creates an Account, Contact & Opportunity in one click.</p>
                    </div>
                    <Button onClick={convertLead} disabled={converting} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-2">
                      {converting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {converting ? "Converting…" : "Convert to Account"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            lead.convertedAccountId && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">Converted to Account</p>
                  <a href={`/dashboard/accounts/${lead.convertedAccountId}`} className="text-xs text-blue-600 hover:underline">
                    View account record →
                  </a>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
