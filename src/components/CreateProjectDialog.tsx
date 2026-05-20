"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createProject,
  getAccount,
  DEFAULT_STAGE_TEMPLATES,
  PROJECT_TYPE_LABELS,
} from "@/lib/firestore";
import type { Opportunity } from "@/types";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Trophy, ArrowRight, X } from "lucide-react";

interface Props {
  opportunity: Opportunity | null;
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({ opportunity, open, onClose }: Props) {
  const router = useRouter();
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "installation",
    startDate: new Date().toISOString().split("T")[0],
    expectedEndDate: "",
    description: "",
  });

  const [stages, setStages] = useState<string[]>(DEFAULT_STAGE_TEMPLATES.installation);
  const [newStage, setNewStage] = useState("");

  // Fetch account name and pre-fill when opportunity changes
  useEffect(() => {
    if (!opportunity?.accountId) return;
    getAccount(opportunity.accountId).then((acc) => {
      const name = acc?.name ?? opportunity.accountId;
      setAccountName(name);
      setForm((f) => ({ ...f, name: `${name} — Project` }));
    });
  }, [opportunity?.accountId]);

  function set(field: string, value: string | null) {
    setForm((f) => ({ ...f, [field]: value ?? "" }));
  }

  function handleTypeChange(type: string | null) {
    if (!type) return;
    setForm((f) => ({ ...f, type }));
    setStages(DEFAULT_STAGE_TEMPLATES[type] ?? []);
  }

  function addStage() {
    const name = newStage.trim();
    if (!name || stages.includes(name)) return;
    setStages((s) => [...s, name]);
    setNewStage("");
  }

  function removeStage(i: number) {
    if (stages.length <= 2) return;
    setStages((s) => s.filter((_, idx) => idx !== i));
  }

  async function handleCreate() {
    if (!opportunity) return;
    if (!form.name.trim()) { toast.error("Enter a project name"); return; }
    if (!form.expectedEndDate) { toast.error("Set an expected end date"); return; }

    setSaving(true);
    try {
      const projectId = await createProject({
        name: form.name.trim(),
        accountId: opportunity.accountId,
        type: form.type,
        stages,
        currentStage: stages[0],
        assignedRep: opportunity.assignedRep,
        startDate: Timestamp.fromDate(new Date(form.startDate)),
        expectedEndDate: Timestamp.fromDate(new Date(form.expectedEndDate)),
        description: form.description || undefined,
      });

      toast.success("Project created!", {
        action: {
          label: "View project",
          onClick: () => router.push(`/dashboard/projects/${projectId}`),
        },
      });
      onClose();
      router.push(`/dashboard/projects/${projectId}`);
    } catch {
      toast.error("Failed to create project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-slate-900">Deal Won — Start a Project</DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Create a delivery project for <span className="font-medium text-slate-700">{accountName}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Project name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Project name *
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="h-10 bg-white border-slate-200"
              placeholder="e.g. Solar install — Phase 1"
            />
          </div>

          {/* Type + dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Project type *
              </Label>
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
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Start date
              </Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="h-10 bg-white border-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Expected end date *
            </Label>
            <Input
              type="date"
              value={form.expectedEndDate}
              onChange={(e) => set("expectedEndDate", e.target.value)}
              className="h-10 bg-white border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Description
            </Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="bg-white border-slate-200 resize-none text-sm"
              placeholder="Scope or notes…"
            />
          </div>

          {/* Stages */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Stages
              </Label>
              <span className="text-xs text-slate-400">{stages.length} stages</span>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 group">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </div>
                  <span className="flex-1 text-sm text-slate-700">{s}</span>
                  {stages.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeStage(i)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStage())}
                className="h-8 text-sm bg-white border-slate-200"
                placeholder="Add a stage…"
              />
              <Button type="button" variant="outline" size="sm" onClick={addStage} className="h-8 border-slate-200 shrink-0">
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-500 h-9">
            Skip for now
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-2"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating…
              </span>
            ) : (
              <>Create project <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
