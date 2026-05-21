"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createLead, createOpportunity, findDuplicateLead, getReps, STAGE_PROBABILITY } from "@/lib/firestore";
import type { LeadSource, LeadStage, LeadScore, AppUser } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, User, Phone, Mail, DollarSign, StickyNote } from "lucide-react";

const SOURCES: { value: LeadSource; label: string; icon: string }[] = [
  { value: "call", label: "Mobile call", icon: "📞" },
  { value: "whatsapp", label: "WhatsApp", icon: "💬" },
  { value: "web", label: "Web form", icon: "🌐" },
  { value: "facebook", label: "Facebook Lead Ads", icon: "📘" },
  { value: "import", label: "CSV import", icon: "📂" },
  { value: "api", label: "API / Webhook", icon: "⚡" },
];

const PRODUCTS = [
  "Solar installation",
  "Service contract",
  "Consultation",
  "Maintenance plan",
  "Software",
  "Marketing",
  "Real Estate",
  "Other",
];

const scoreFromStage = (stage: LeadStage, budget?: number): LeadScore => {
  if (stage === "confirmed") return "hot";
  if (stage === "warm" && budget) return "warm";
  return "cold";
};

function FieldIcon({ icon: Icon }: { icon: React.ElementType }) {
  return <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />;
}

export default function NewLeadPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const [reps, setReps] = useState<AppUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<{ id: string; fullName: string } | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    whatsapp: "",
    email: "",
    source: "" as LeadSource,
    productInterest: "",
    budget: "",
    notes: "",
    assignedRep: "",
    stage: "cold" as LeadStage,
  });

  useEffect(() => {
    getReps().then((r) => {
      setReps(r);
      if (appUser && !form.assignedRep) {
        setForm((f) => ({ ...f, assignedRep: appUser.uid }));
      }
    });
  }, [appUser]);

  function set(field: string, value: string | null) {
    setForm((f) => ({ ...f, [field]: value ?? "" }));
    setDuplicate(null);
  }

  async function checkDuplicate() {
    if (!form.phone && !form.email) return;
    const dup = await findDuplicateLead(form.phone, form.email || undefined);
    if (dup) setDuplicate({ id: dup.id, fullName: dup.fullName });
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.source) { toast.error("Please select a source channel"); return; }
    if (!form.productInterest) { toast.error("Please select a product"); return; }
    if (!form.assignedRep) { toast.error("Please assign a rep"); return; }

    setSaving(true);
    try {
      const budget = form.budget ? parseFloat(form.budget) : undefined;
      const stage = form.stage as LeadStage;
      const score = scoreFromStage(stage, budget);

      const leadId = await createLead({
        fullName: form.fullName,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        source: form.source,
        productInterest: form.productInterest,
        budget,
        notes: form.notes || undefined,
        assignedRep: form.assignedRep,
        stage,
        score,
        isConverted: false,
      });

      // Auto-create pipeline opportunity so the lead appears on the Kanban board
      await createOpportunity({
        accountId: "",
        leadId,
        leadName: form.fullName,
        pipeline: "new_sales",
        stage: "new_lead",
        probability: STAGE_PROBABILITY["new_lead"],
        value: budget ?? 0,
        assignedRep: form.assignedRep,
      });

      toast.success("Lead created and added to pipeline");
      router.push("/dashboard/leads");
    } catch {
      toast.error("Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to leads
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">New Lead</h1>
        <p className="text-sm text-slate-500 mt-1">Fill in the details from your initial conversation.</p>
      </div>

      {/* Duplicate warning */}
      {duplicate && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            Possible duplicate:{" "}
            <a href={`/dashboard/leads/${duplicate.id}`} className="font-semibold underline">
              {duplicate.fullName}
            </a>
            {" "}— you can still save this as a new record.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Contact section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-700">Contact Details</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full name *</Label>
              <div className="relative">
                <FieldIcon icon={User} />
                <Input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  className="pl-9 h-10 bg-white border-slate-200"
                  placeholder="Jane Smith"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone *</Label>
              <div className="relative">
                <FieldIcon icon={Phone} />
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  onBlur={checkDuplicate}
                  className="pl-9 h-10 bg-white border-slate-200"
                  placeholder="+1 555 000 0000"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp</Label>
              <div className="relative">
                <FieldIcon icon={Phone} />
                <Input
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  className="pl-9 h-10 bg-white border-slate-200"
                  placeholder="If different from phone"
                />
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</Label>
              <div className="relative">
                <FieldIcon icon={Mail} />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={checkDuplicate}
                  className="pl-9 h-10 bg-white border-slate-200"
                  placeholder="jane@company.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lead details section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-700">Lead Details</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Source channel *</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger className="h-10 bg-white border-slate-200">
                  <SelectValue placeholder="Select source…" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">{s.icon} {s.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Product interest *</Label>
              <Select value={form.productInterest} onValueChange={(v) => set("productInterest", v)}>
                <SelectTrigger className="h-10 bg-white border-slate-200">
                  <SelectValue placeholder="Select product…" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Budget</Label>
              <div className="relative">
                <FieldIcon icon={DollarSign} />
                <Input
                  type="number"
                  value={form.budget}
                  onChange={(e) => set("budget", e.target.value)}
                  className="pl-9 h-10 bg-white border-slate-200"
                  placeholder="Leave blank if unknown"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer stage *</Label>
              <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger className="h-10 bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
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
              <div className="relative">
                <StickyNote className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="pl-9 bg-white border-slate-200 resize-none"
                  placeholder="Notes from your initial conversation…"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-10 rounded-lg font-medium"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : "Create Lead"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-10 rounded-lg border-slate-200 text-slate-600"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
