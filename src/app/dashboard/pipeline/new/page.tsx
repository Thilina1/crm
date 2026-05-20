"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createOpportunity, getLeads, getReps, STAGE_LABELS, PIPELINE_STAGES } from "@/lib/firestore";
import type { OpportunityStage, Lead, AppUser } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { ArrowLeft, DollarSign } from "lucide-react";

function NewDealForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appUser } = useAuth();

  const defaultPipeline = searchParams.get("pipeline") ?? "new_sales";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [reps, setReps] = useState<AppUser[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    accountId: "",
    pipeline: defaultPipeline,
    stage: "new_lead" as OpportunityStage,
    value: "",
    assignedRep: "",
  });

  useEffect(() => {
    Promise.all([getLeads(), getReps()]).then(([lds, rps]) => {
      setLeads(lds);
      setReps(rps);
      if (appUser) setForm((f) => ({ ...f, assignedRep: appUser.uid }));
    });
  }, [appUser]);

  function set(field: string, value: string | null) {
    setForm((f) => ({ ...f, [field]: value ?? "" }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.accountId) { toast.error("Select a lead"); return; }
    if (!form.assignedRep) { toast.error("Assign a rep"); return; }

    setSaving(true);
    try {
      const id = await createOpportunity({
        accountId: form.accountId,
        pipeline: form.pipeline,
        stage: form.stage,
        value: form.value ? parseFloat(form.value) : 0,
        probability: 10,
        assignedRep: form.assignedRep,
      });
      toast.success("Deal created");
      router.push(`/dashboard/pipeline/${id}`);
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to pipeline
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">New Deal</h1>
        <p className="text-sm text-slate-500 mt-1">Add a deal to your sales pipeline.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-700">Deal details</h2>
          </div>
          <div className="p-5 space-y-4">

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Lead *
              </Label>
              <SearchableSelect
                value={form.accountId}
                onValueChange={(v) => set("accountId", v)}
                options={leads.map((l) => ({ value: l.id, label: l.fullName }))}
                placeholder="Select lead…"
                searchPlaceholder="Search leads…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Pipeline *
                </Label>
                <Select value={form.pipeline} onValueChange={(v) => set("pipeline", v)}>
                  <SelectTrigger className="h-10 bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_sales">New Sales</SelectItem>
                    <SelectItem value="renewals">Renewals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Starting stage
                </Label>
                <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                  <SelectTrigger className="h-10 bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.filter((s) => !["closed_won", "closed_lost"].includes(s)).map((s) => (
                      <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Deal value
                </Label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="number"
                    value={form.value}
                    onChange={(e) => set("value", e.target.value)}
                    className="pl-9 h-10 bg-white border-slate-200"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Assigned rep *
                </Label>
                <SearchableSelect
                  value={form.assignedRep}
                  onValueChange={(v) => set("assignedRep", v)}
                  options={reps.map((r) => ({ value: r.uid, label: r.name }))}
                  placeholder="Select rep…"
                  searchPlaceholder="Search reps…"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            ) : "Create deal"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-10 border-slate-200 text-slate-600">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewDealPage() {
  return (
    <Suspense>
      <NewDealForm />
    </Suspense>
  );
}
