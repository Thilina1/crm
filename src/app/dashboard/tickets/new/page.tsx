"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createTicket, getProjects, getReps } from "@/lib/firestore";
import type { TicketPriority, TicketStatus, TicketSource, AppUser, Project } from "@/types";
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
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function NewTicketPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { appUser }  = useAuth();

  // Pre-filled from project page: ?projectId=xxx&accountId=yyy
  const preProjectId = searchParams.get("projectId") ?? "";
  const preAccountId = searchParams.get("accountId") ?? "";

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [reps, setReps]               = useState<AppUser[]>([]);
  const [saving, setSaving]           = useState(false);

  const [form, setForm] = useState({
    title:       "",
    description: "",
    accountId:   preAccountId,   // derived from selected project
    projectId:   preProjectId,
    priority:    "" as TicketPriority,
    source:      "" as TicketSource,
    status:      "open" as TicketStatus,
    assignedRep: "",
    dueDate:     "",
  });

  useEffect(() => {
    Promise.all([getProjects(), getReps()]).then(([projs, r]) => {
      setAllProjects(projs);
      setReps(r);
      if (appUser) {
        setForm((f) => ({ ...f, assignedRep: f.assignedRep || appUser.uid }));
      }
    });
  }, [appUser]);

  function handleProjectChange(projectId: string) {
    const project = allProjects.find((p) => p.id === projectId);
    setForm((f) => ({
      ...f,
      projectId,
      accountId: project?.accountId ?? "",
    }));
  }

  function set(field: string, value: string | null) {
    setForm((f) => ({ ...f, [field]: value ?? "" }));
  }

  // The project linked to the current form selection
  const selectedProject = allProjects.find((p) => p.id === form.projectId);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.projectId)   { toast.error("Please select a project"); return; }
    if (!form.priority)    { toast.error("Please select a priority"); return; }
    if (!form.source)      { toast.error("Please select a source"); return; }
    if (!form.assignedRep) { toast.error("Please assign a rep"); return; }

    setSaving(true);
    try {
      const id = await createTicket({
        accountId:   form.accountId,
        projectId:   form.projectId,
        title:       form.title,
        description: form.description,
        priority:    form.priority,
        status:      form.status,
        source:      form.source,
        assignedRep: form.assignedRep,
        dueDate:     form.dueDate
          ? Timestamp.fromDate(new Date(form.dueDate))
          : undefined,
      });
      toast.success("Ticket created");
      router.push(`/dashboard/tickets/${id}`);
    } catch {
      toast.error("Failed to create ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.push("/dashboard/tickets")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to tickets
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">New Ticket</h1>
        <p className="text-sm text-slate-500 mt-1">Log a support issue or internal task.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Core details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-700">Ticket Details</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">

            {/* Title */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="h-10 bg-white border-slate-200"
                placeholder="Short summary of the issue…"
                required
              />
            </div>

            {/* Description */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description *</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="bg-white border-slate-200 resize-none"
                placeholder="Describe the issue in detail…"
                required
              />
            </div>

            {/* Project — primary selector */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Project *</Label>
              {preProjectId ? (
                /* Read-only when navigating from a project page */
                <div className="h-10 flex items-center gap-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
                  <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium truncate">
                    {selectedProject?.name ?? preProjectId}
                  </span>
                </div>
              ) : (
                <SearchableSelect
                  value={form.projectId}
                  onValueChange={handleProjectChange}
                  options={allProjects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Select project…"
                  searchPlaceholder="Search projects…"
                />
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Priority *</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger className="h-10 bg-white border-slate-200">
                  <SelectValue placeholder="Select priority…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Source *</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger className="h-10 bg-white border-slate-200">
                  <SelectValue placeholder="Select source…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">📞 Call</SelectItem>
                  <SelectItem value="internal">🔒 Internal</SelectItem>
                  <SelectItem value="portal">🖥 Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="h-10 bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned rep */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Assigned Rep *</Label>
              <SearchableSelect
                value={form.assignedRep}
                onValueChange={(v) => set("assignedRep", v)}
                options={reps.map((r) => ({ value: r.uid, label: r.name }))}
                placeholder="Select rep…"
                searchPlaceholder="Search reps…"
              />
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className="h-10 bg-white border-slate-200"
              />
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
            ) : "Create Ticket"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/tickets")}
            className="h-10 rounded-lg border-slate-200 text-slate-600"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
