"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  createProject,
  getLeads,
  getReps,
  DEFAULT_STAGE_TEMPLATES,
  PROJECT_TYPE_LABELS,
} from "@/lib/firestore";
import type { Lead, AppUser } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function NewProjectPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reps, setReps] = useState<AppUser[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    accountId: "",
    type: "installation",
    assignedRep: "",
    startDate: "",
    expectedEndDate: "",
    description: "",
  });

  // Editable stages derived from the selected project type
  const [stages, setStages] = useState<string[]>(
    DEFAULT_STAGE_TEMPLATES.installation
  );
  const [newStage, setNewStage] = useState("");

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

  function handleTypeChange(type: string | null) {
    if (!type) return;
    setForm((f) => ({ ...f, type }));
    setStages(DEFAULT_STAGE_TEMPLATES[type] ?? []);
  }

  function moveStage(i: number, dir: -1 | 1) {
    const s = [...stages];
    [s[i], s[i + dir]] = [s[i + dir], s[i]];
    setStages(s);
  }

  function removeStage(i: number) {
    if (stages.length <= 2) { toast.error("Need at least 2 stages"); return; }
    setStages(stages.filter((_, idx) => idx !== i));
  }

  function addStage() {
    const name = newStage.trim();
    if (!name) return;
    if (stages.includes(name)) { toast.error("Stage already exists"); return; }
    setStages([...stages, name]);
    setNewStage("");
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.accountId) { toast.error("Select a lead"); return; }
    if (!form.assignedRep) { toast.error("Assign a rep"); return; }
    if (!form.startDate || !form.expectedEndDate) { toast.error("Set start and end dates"); return; }
    if (stages.length < 2) { toast.error("Add at least 2 stages"); return; }

    setSaving(true);
    try {
      const id = await createProject({
        name: form.name,
        accountId: form.accountId,
        type: form.type,
        stages,
        currentStage: stages[0],
        assignedRep: form.assignedRep,
        startDate: Timestamp.fromDate(new Date(form.startDate)),
        expectedEndDate: Timestamp.fromDate(new Date(form.expectedEndDate)),
        description: form.description || undefined,
      });
      toast.success("Project created");
      router.push(`/dashboard/projects/${id}`);
    } catch {
      toast.error("Failed to create project");
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
        Back to projects
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">New Project</h1>
        <p className="text-sm text-slate-500 mt-1">Track delivery work for a customer account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-700">Project Details</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Project name *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="h-10 bg-white border-slate-200"
                placeholder='e.g. "Solar install — Phase 1"'
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Lead *</Label>
              <SearchableSelect
                value={form.accountId}
                onValueChange={(v) => set("accountId", v)}
                options={leads.map((l) => ({ value: l.id, label: l.fullName }))}
                placeholder="Select lead…"
                searchPlaceholder="Search leads…"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Project type *</Label>
              <Select value={form.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-10 bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Start date *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="h-10 bg-white border-slate-200"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Expected end date *</Label>
              <Input
                type="date"
                value={form.expectedEndDate}
                onChange={(e) => set("expectedEndDate", e.target.value)}
                className="h-10 bg-white border-slate-200"
                required
              />
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
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="bg-white border-slate-200 resize-none"
                placeholder="Scope or notes…"
              />
            </div>
          </div>
        </div>

        {/* Stage editor */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Project Stages</h2>
              <p className="text-xs text-slate-400 mt-0.5">Loaded from the {PROJECT_TYPE_LABELS[form.type]} template — reorder or customise</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
              {stages.length} stages
            </span>
          </div>
          <div className="p-5 space-y-2">
            {stages.map((stage, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 group"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </div>
                <span className="flex-1 text-sm text-slate-700 font-medium">{stage}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => moveStage(i, -1)}
                    disabled={i === 0}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 disabled:opacity-20 transition-colors"
                    title="Move up"
                  >
                    <ArrowRight className="w-3 h-3 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(i, 1)}
                    disabled={i === stages.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 disabled:opacity-20 transition-colors"
                    title="Move down"
                  >
                    <ArrowRight className="w-3 h-3 rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStage(i)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add stage */}
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStage())}
                className="h-9 bg-white border-slate-200 text-sm"
                placeholder="Add a stage…"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStage}
                className="h-9 border-slate-200 shrink-0"
              >
                Add
              </Button>
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
                Creating…
              </span>
            ) : "Create project"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-10 border-slate-200 text-slate-600">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
