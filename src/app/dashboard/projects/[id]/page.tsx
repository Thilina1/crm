"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getProject,
  updateProject,
  getProjectEvents,
  createProjectEvent,
  deleteProjectEvent,
  getProjectMembers,
  getUserByEmail,
  addProjectMember,
  PROJECT_TYPE_LABELS,
  getInvoices,
  createInvoice,
  updateInvoice,
  getPayments,
  recordPayment,
  getLead,
} from "@/lib/firestore";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { provisionAuth, provisionDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Project, ProjectEvent, AppUser, Invoice, Payment, InvoiceStatus, PaymentMethod } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, ChevronRight, Calendar, Plus, Trash2,
  Lock, Eye, Briefcase, CheckCircle2, Clock, UserPlus, Users,
  Receipt, DollarSign,
} from "lucide-react";
import { formatDate, formatDistanceToNow } from "@/lib/date";
import { Timestamp } from "firebase/firestore";

// ─── Stage stepper ────────────────────────────────────────────────────────────

function StageStepper({
  stages,
  current,
  onChange,
  readOnly = false,
}: {
  stages: string[];
  current: string;
  onChange: (s: string) => void;
  readOnly?: boolean;
}) {
  const idx = stages.indexOf(current);

  return (
    <div className="space-y-4">
      {/* Visual stepper */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {stages.map((stage, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={stage} className="flex items-center shrink-0">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onChange(stage)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-center min-w-[90px] disabled:cursor-default ${
                  active
                    ? "bg-blue-600 text-white shadow-md"
                    : done
                    ? `text-blue-600 ${readOnly ? "" : "hover:bg-blue-50"}`
                    : `text-slate-400 ${readOnly ? "" : "hover:bg-slate-50"}`
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    active
                      ? "bg-white text-blue-600 border-white"
                      : done
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-300 text-slate-400"
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs font-medium leading-tight">{stage}</span>
              </button>

              {i < stages.length - 1 && (
                <ChevronRight
                  className={`w-4 h-4 shrink-0 mx-0.5 ${i < idx ? "text-blue-400" : "text-slate-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{
              width: `${stages.length > 1 ? (idx / (stages.length - 1)) * 100 : 100}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Stage {idx + 1} of {stages.length}</span>
          <span>
            {stages.length > 1
              ? `${Math.round((idx / (stages.length - 1)) * 100)}% complete`
              : "Complete"}
          </span>
        </div>
      </div>

      {/* Next / prev buttons — hidden in read-only (customer) mode */}
      {!readOnly && (
        <div className="flex gap-2">
          {idx > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-600"
              onClick={() => onChange(stages[idx - 1])}
            >
              ← {stages[idx - 1]}
            </Button>
          )}
          {idx < stages.length - 1 && (
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
              onClick={() => onChange(stages[idx + 1])}
            >
              Move to {stages[idx + 1]} →
            </Button>
          )}
          {idx === stages.length - 1 && (
            <span className="ml-auto flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Project complete
            </span>
          )}
        </div>
      )}
      {readOnly && idx === stages.length - 1 && (
        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <CheckCircle2 className="w-4 h-4" /> Project complete
        </span>
      )}
    </div>
  );
}

// ─── Event form ───────────────────────────────────────────────────────────────

function AddEventForm({
  projectId,
  onAdded,
}: {
  projectId: string;
  onAdded: (ev: ProjectEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    scheduledAt: "",
    visibility: "internal" as "internal" | "customer",
    notes: "",
    assignedTo: "",
  });

  function set(field: string, value: string | null) {
    setForm((f) => ({ ...f, [field]: value ?? "" }));
  }

  async function handleSave() {
    if (!form.title || !form.scheduledAt) {
      toast.error("Title and date are required");
      return;
    }
    setSaving(true);
    try {
      const id = await createProjectEvent(projectId, {
        title: form.title,
        scheduledAt: Timestamp.fromDate(new Date(form.scheduledAt)),
        visibility: form.visibility,
        notes: form.notes || undefined,
        assignedTo: form.assignedTo || "",
      });
      const ev: ProjectEvent = {
        id,
        projectId,
        title: form.title,
        scheduledAt: Timestamp.fromDate(new Date(form.scheduledAt)),
        visibility: form.visibility,
        notes: form.notes || undefined,
        assignedTo: form.assignedTo || "",
        createdAt: Timestamp.now(),
      };
      onAdded(ev);
      setForm({ title: "", scheduledAt: "", visibility: "internal", notes: "", assignedTo: "" });
      setOpen(false);
      toast.success("Event added");
    } catch {
      toast.error("Failed to add event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add event
        </button>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">New event</p>

          <Input
            placeholder="Event title *"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="h-9 bg-white border-slate-200 text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Date & time *</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => set("scheduledAt", e.target.value)}
                className="h-9 bg-white border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Visibility</Label>
              <Select value={form.visibility} onValueChange={(v) => set("visibility", v)}>
                <SelectTrigger className="h-9 bg-white border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">🔒 Internal only</SelectItem>
                  <SelectItem value="customer">👁 Visible to customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            className="bg-white border-slate-200 resize-none text-sm"
          />

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white h-8"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save event"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-slate-500"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Project Users ────────────────────────────────────────────────────────────

function ProjectUsersSection({
  projectId,
  initialMemberUids = [],
}: {
  projectId: string;
  initialMemberUids?: string[];
}) {
  const [memberUids, setMemberUids] = useState<string[]>(initialMemberUids);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    getProjectMembers(initialMemberUids).then(setMembers).finally(() => setLoadingMembers(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      let uid: string;
      let isNew = true;

      // If a Firestore profile already exists for this email, reuse that UID
      const existing = await getUserByEmail(form.email);
      if (existing) {
        uid = existing.uid;
        isNew = false;
      } else {
        // Create Firebase Auth user via secondary app so the rep's session is not replaced
        const cred = await createUserWithEmailAndPassword(provisionAuth, form.email, "1234567890");
        uid = cred.user.uid;
        await updateProfile(cred.user, { displayName: form.name });
        // Write profile using provisionDb (authenticated as the new user) so the
        // Firestore rule "allow create: if request.auth.uid == userId" is satisfied.
        await setDoc(doc(provisionDb, "users", uid), {
          name:      form.name,
          email:     form.email,
          role:      "customer",
          createdAt: serverTimestamp(),
        }, { merge: true });
        signOut(provisionAuth).catch(() => {}); // best-effort cleanup
      }

      await addProjectMember(projectId, uid);

      const newUids = memberUids.includes(uid) ? memberUids : [...memberUids, uid];
      setMemberUids(newUids);
      setMembers(await getProjectMembers(newUids));

      toast.success(
        isNew
          ? `User created — login: ${form.email} / 1234567890`
          : `Existing user added to project`,
        { duration: 8000 }
      );
      setForm({ name: "", email: "" });
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            Project Users
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {members.length} member{members.length !== 1 ? "s" : ""} with portal access
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Add user form */}
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add user
          </button>
        ) : (
          <form
            onSubmit={handleAdd}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
          >
            <p className="text-sm font-semibold text-slate-700">New project user</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Full name *</Label>
                <Input
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-9 bg-white border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Email *</Label>
                <Input
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-9 bg-white border-slate-200 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              A login will be created with the default password <span className="font-mono font-semibold text-slate-600">1234567890</span>.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                disabled={saving}
              >
                {saving ? "Adding…" : "Add user"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-slate-500"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Members list */}
        {loadingMembers ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            No users yet — add one above.
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const initials = member.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <div
                  key={member.uid}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{member.name}</p>
                    <p className="text-xs text-slate-400 truncate">{member.email}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    Customer
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { appUser } = useAuth();
  const isCustomer = appUser?.role === "customer";
  const [project, setProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [budget, setBudget] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProject(id), getProjectEvents(id)]).then(([p, evs]) => {
      setProject(p);
      setEvents(evs);
      setLoading(false);
      if (p?.accountId) getLead(p.accountId).then((l) => setBudget(l?.budget));
    });
  }, [id]);

  async function handleStageChange(stage: string) {
    if (!project) return;
    setProject({ ...project, currentStage: stage });
    await updateProject(id, { currentStage: stage });
    toast.success(`Moved to "${stage}"`);
  }

  async function handleDeleteEvent(eventId: string) {
    await deleteProjectEvent(id, eventId);
    setEvents((evs) => evs.filter((e) => e.id !== eventId));
    toast.success("Event removed");
  }

  if (loading) {
    return (
      <div className="p-6  space-y-4">
        <div className="h-6 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="h-56 bg-white rounded-xl border animate-pulse" />
        <div className="h-40 bg-white rounded-xl border animate-pulse" />
      </div>
    );
  }

  if (!project) return <div className="p-6 text-sm text-slate-400">Project not found.</div>;

  const isComplete = project.currentStage === project.stages[project.stages.length - 1];
  const isOverdue =
    !isComplete && project.expectedEndDate && project.expectedEndDate.toMillis() < Date.now();

  const visibleEvents = isCustomer
    ? events.filter((e) => e.visibility === "customer")
    : events;

  const upcomingEvents = visibleEvents.filter(
    (e) => e.scheduledAt?.toMillis?.() >= Date.now()
  );
  const pastEvents = visibleEvents.filter(
    (e) => e.scheduledAt?.toMillis?.() < Date.now()
  );

  return (
    <div className="p-6  space-y-5">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to projects
      </button>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0a0f1e] to-[#0f1f40] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-medium mb-1">
                {PROJECT_TYPE_LABELS[project.type] ?? project.type}
              </p>
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-white/50 mt-1">{project.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {isComplete && (
                <span className="flex items-center gap-1.5 bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                </span>
              )}
              {isOverdue && !isComplete && (
                <span className="flex items-center gap-1.5 bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                  Overdue
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-white/50">
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              {PROJECT_TYPE_LABELS[project.type] ?? project.type}
            </span>
            {project.startDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(project.startDate.toDate())} →{" "}
                {project.expectedEndDate ? formatDate(project.expectedEndDate.toDate()) : "—"}
              </span>
            )}
            {isOverdue && !isComplete && (
              <span className="text-red-300 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Overdue by {formatDistanceToNow(project.expectedEndDate!.toDate())}
              </span>
            )}
          </div>
        </div>

        {/* Stage stepper */}
        <div className="px-6 py-5 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Project progress
          </p>
          <StageStepper
            stages={project.stages}
            current={project.currentStage}
            onChange={handleStageChange}
            readOnly={isCustomer}
          />
        </div>
      </div>

      {/* Events & milestones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Events & Milestones</h2>
            <p className="text-xs text-slate-400 mt-0.5">{visibleEvents.length} total · {upcomingEvents.length} upcoming</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {!isCustomer && (
            <AddEventForm projectId={id} onAdded={(ev) => setEvents((evs) => [...evs, ev].sort((a, b) => a.scheduledAt?.toMillis() - b.scheduledAt?.toMillis()))} />
          )}

          {/* Upcoming */}
          {upcomingEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Upcoming</p>
              {upcomingEvents.map((ev) => (
                <EventRow key={ev.id} event={ev} onDelete={() => handleDeleteEvent(ev.id)} readOnly={isCustomer} />
              ))}
            </div>
          )}

          {/* Past */}
          {pastEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Past</p>
              {pastEvents.map((ev) => (
                <EventRow key={ev.id} event={ev} onDelete={() => handleDeleteEvent(ev.id)} past readOnly={isCustomer} />
              ))}
            </div>
          )}

          {events.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No events yet — add one above.</p>
          )}
        </div>
      </div>

      {/* Project users */}
      {!isCustomer && (
        <ProjectUsersSection
          projectId={id}
          initialMemberUids={project.memberUids ?? []}
        />
      )}

      {/* Billing */}
      <BillingSection projectId={id} isCustomer={isCustomer} budget={budget} />

      {/* Documents placeholder */}
      <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center space-y-2">
        <p className="text-sm font-medium text-slate-500">Documents</p>
        <p className="text-xs text-slate-400">Google Drive integration coming in Phase 4</p>
      </div>
    </div>
  );
}

// ─── Billing ─────────────────────────────────────────────────────────────────

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

function invoiceStatusDisplay(inv: Invoice): { label: string; classes: string } {
  if (inv.paidAmount >= inv.amount)
    return { label: "Paid", classes: "bg-green-50 text-green-600 border-green-100" };
  if (inv.paidAmount > 0)
    return { label: "Partial", classes: "bg-amber-50 text-amber-600 border-amber-100" };
  if (inv.status === "draft")
    return { label: "Draft", classes: "bg-slate-100 text-slate-500 border-slate-200" };
  if (inv.dueDate?.toMillis() < Date.now())
    return { label: "Overdue", classes: "bg-red-50 text-red-600 border-red-100" };
  return { label: "Sent", classes: "bg-blue-50 text-blue-600 border-blue-100" };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function BillingSection({ projectId, isCustomer, budget }: { projectId: string; isCustomer: boolean; budget?: number }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadedPayments, setLoadedPayments] = useState<Record<string, Payment[]>>({});
  const [paymentForms, setPaymentForms] = useState<Record<string, boolean>>({});
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingPayment, setSavingPayment] = useState<string | null>(null);

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: "", description: "", amount: "", dueDate: "", status: "draft" as InvoiceStatus,
  });
  const [paymentForm, setPaymentForm] = useState<Record<string, {
    amount: string; method: PaymentMethod; note: string; paidAt: string;
  }>>({});

  useEffect(() => {
    getInvoices(projectId)
      .then((all) => setInvoices(isCustomer ? all.filter((i) => i.status !== "draft") : all))
      .finally(() => setLoading(false));
  }, [projectId]);

  function openNewForm() {
    const num = String(invoices.length + 1).padStart(3, "0");
    setInvoiceForm((f) => ({ ...f, invoiceNumber: `INV-${num}` }));
    setShowNewForm(true);
  }

  async function handleCreateInvoice(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invoiceForm.description || !invoiceForm.amount || !invoiceForm.dueDate) {
      toast.error("Description, amount, and due date are required"); return;
    }
    setSavingInvoice(true);
    try {
      const id = await createInvoice(projectId, {
        invoiceNumber: invoiceForm.invoiceNumber,
        description: invoiceForm.description,
        amount: parseFloat(invoiceForm.amount),
        status: invoiceForm.status,
        dueDate: Timestamp.fromDate(new Date(invoiceForm.dueDate)),
        issuedAt: Timestamp.now(),
      });
      setInvoices((prev) => [{
        id, projectId,
        invoiceNumber: invoiceForm.invoiceNumber,
        description: invoiceForm.description,
        amount: parseFloat(invoiceForm.amount),
        paidAmount: 0,
        status: invoiceForm.status,
        dueDate: Timestamp.fromDate(new Date(invoiceForm.dueDate)),
        issuedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, ...prev]);
      setInvoiceForm({ invoiceNumber: "", description: "", amount: "", dueDate: "", status: "draft" });
      setShowNewForm(false);
      toast.success("Invoice created");
    } catch { toast.error("Failed to create invoice"); }
    finally { setSavingInvoice(false); }
  }

  async function toggleExpand(invoiceId: string) {
    if (expandedId === invoiceId) { setExpandedId(null); return; }
    setExpandedId(invoiceId);
    if (!loadedPayments[invoiceId]) {
      const pmts = await getPayments(projectId, invoiceId);
      setLoadedPayments((p) => ({ ...p, [invoiceId]: pmts }));
    }
  }

  function initPaymentForm(invoiceId: string, remaining: number) {
    setPaymentForm((f) => ({
      ...f,
      [invoiceId]: {
        amount: remaining.toFixed(2), method: "bank_transfer", note: "",
        paidAt: new Date().toISOString().split("T")[0],
      },
    }));
    setPaymentForms((f) => ({ ...f, [invoiceId]: true }));
  }

  async function handleMarkAsSent(inv: Invoice) {
    try {
      await updateInvoice(projectId, inv.id, { status: "sent" });
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: "sent" } : i));
      toast.success("Invoice marked as sent");
    } catch {
      toast.error("Failed to update invoice");
    }
  }

  async function handleRecordPayment(inv: Invoice) {
    const form = paymentForm[inv.id];
    if (!form?.amount || !form?.paidAt) { toast.error("Amount and date are required"); return; }
    setSavingPayment(inv.id);
    try {
      const amount = parseFloat(form.amount);
      await recordPayment(projectId, inv.id,
        { amount, method: form.method, note: form.note || undefined, paidAt: Timestamp.fromDate(new Date(form.paidAt)) },
        inv.paidAmount, inv.amount,
      );
      const newPaid = Math.min(inv.paidAmount + amount, inv.amount);
      const newStatus: InvoiceStatus = newPaid >= inv.amount ? "paid" : newPaid > 0 ? "partial" : "sent";
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, paidAmount: newPaid, status: newStatus } : i));
      setLoadedPayments((p) => ({
        ...p,
        [inv.id]: [{ id: Math.random().toString(36), invoiceId: inv.id, projectId, amount, method: form.method, note: form.note || undefined, paidAt: Timestamp.fromDate(new Date(form.paidAt)), createdAt: Timestamp.now() }, ...(p[inv.id] ?? [])],
      }));
      setPaymentForms((f) => ({ ...f, [inv.id]: false }));
      toast.success("Payment recorded");
    } catch { toast.error("Failed to record payment"); }
    finally { setSavingPayment(null); }
  }

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding   = totalInvoiced - totalPaid;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-400" />
            Billing & Payments
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        </div>
        {!isCustomer && (
          <button onClick={openNewForm} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
            <Plus className="w-4 h-4" /> New invoice
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Summary */}
        <div className={`grid gap-3 ${budget != null ? "grid-cols-4" : "grid-cols-3"}`}>
          {[
            ...(budget != null ? [{ label: "Budget", value: fmt(budget), color: "text-indigo-600" }] : []),
            { label: "Total Invoiced", value: fmt(totalInvoiced), color: "text-slate-700" },
            { label: "Total Paid",     value: fmt(totalPaid),     color: "text-green-600" },
            { label: "Outstanding",    value: fmt(outstanding),   color: outstanding > 0 ? "text-amber-600" : "text-slate-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className={`text-sm font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* New invoice form */}
        {showNewForm && (
          <form onSubmit={handleCreateInvoice} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">New invoice</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Invoice # *</Label>
                <input value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  placeholder="INV-001" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Amount *</Label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input type="number" min="0" step="0.01" value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
                    className="flex h-9 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    placeholder="0.00" />
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Description *</Label>
                <input value={invoiceForm.description} onChange={(e) => setInvoiceForm((f) => ({ ...f, description: e.target.value }))}
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  placeholder="e.g. Installation — Phase 1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Due date *</Label>
                <input type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Status</Label>
                <Select value={invoiceForm.status} onValueChange={(v) => setInvoiceForm((f) => ({ ...f, status: v as InvoiceStatus }))}>
                  <SelectTrigger className="h-9 bg-white border-slate-200 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8" disabled={savingInvoice}>
                {savingInvoice ? "Saving…" : "Create invoice"}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 text-slate-500" onClick={() => setShowNewForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {/* Invoice list */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No invoices yet — create one above.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const { label: statusLabel, classes: statusClasses } = invoiceStatusDisplay(inv);
              const remaining  = inv.amount - inv.paidAmount;
              const expanded   = expandedId === inv.id;
              const pmts       = loadedPayments[inv.id] ?? [];
              const showPayForm = paymentForms[inv.id];
              const pForm      = paymentForm[inv.id];

              return (
                <div key={inv.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => toggleExpand(inv.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">{inv.invoiceNumber}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusClasses}`}>{statusLabel}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{inv.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800">{fmt(inv.amount)}</p>
                      {inv.paidAmount > 0 && remaining > 0 && (
                        <p className="text-xs text-amber-500">{fmt(remaining)} remaining</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">Due {formatDate(inv.dueDate.toDate())}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 pb-4 pt-3 space-y-3">
                      {/* Payment progress */}
                      <div className="space-y-1">
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${Math.min((inv.paidAmount / inv.amount) * 100, 100)}%` }} />
                        </div>
                        <p className="text-xs text-slate-400">{fmt(inv.paidAmount)} of {fmt(inv.amount)} paid</p>
                      </div>

                      {/* Payment history */}
                      {pmts.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payments</p>
                          {pmts.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 text-xs bg-white border border-slate-100 rounded-lg px-3 py-2">
                              <span className="text-green-600 font-semibold">{fmt(p.amount)}</span>
                              <span className="text-slate-400">{PAYMENT_METHOD_LABELS[p.method]}</span>
                              <span className="text-slate-400">{formatDate(p.paidAt.toDate())}</span>
                              {p.note && <span className="text-slate-500 truncate flex-1">{p.note}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Mark as sent */}
                      {!isCustomer && inv.status === "draft" && (
                        <button type="button" onClick={() => handleMarkAsSent(inv)}
                          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark as sent
                        </button>
                      )}

                      {/* Record payment */}
                      {!isCustomer && remaining > 0 && inv.status !== "draft" && (
                        !showPayForm ? (
                          <button type="button" onClick={() => initPaymentForm(inv.id, remaining)}
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Record payment
                          </button>
                        ) : (
                          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                            <p className="text-xs font-semibold text-slate-700">Record payment</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Amount *</Label>
                                <div className="relative">
                                  <DollarSign className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <input type="number" min="0" step="0.01" value={pForm?.amount ?? ""}
                                    onChange={(e) => setPaymentForm((f) => ({ ...f, [inv.id]: { ...f[inv.id], amount: e.target.value } }))}
                                    className="flex h-8 w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Date *</Label>
                                <input type="date" value={pForm?.paidAt ?? ""}
                                  onChange={(e) => setPaymentForm((f) => ({ ...f, [inv.id]: { ...f[inv.id], paidAt: e.target.value } }))}
                                  className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Method</Label>
                                <Select value={pForm?.method ?? "bank_transfer"}
                                  onValueChange={(v) => setPaymentForm((f) => ({ ...f, [inv.id]: { ...f[inv.id], method: v as PaymentMethod } }))}>
                                  <SelectTrigger className="h-8 bg-white border-slate-200 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                                      <SelectItem key={v} value={v}>{l}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Note</Label>
                                <input value={pForm?.note ?? ""}
                                  onChange={(e) => setPaymentForm((f) => ({ ...f, [inv.id]: { ...f[inv.id], note: e.target.value } }))}
                                  className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                                  placeholder="Optional" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                                disabled={savingPayment === inv.id} onClick={() => handleRecordPayment(inv)}>
                                {savingPayment === inv.id ? "Saving…" : "Save payment"}
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-slate-500"
                                onClick={() => setPaymentForms((f) => ({ ...f, [inv.id]: false }))}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )
                      )}
                      {!isCustomer && remaining <= 0 && (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fully paid
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({
  event,
  onDelete,
  past = false,
  readOnly = false,
}: {
  event: ProjectEvent;
  onDelete: () => void;
  past?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border group ${past ? "bg-slate-50/50 border-slate-100" : "bg-white border-slate-200"}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${past ? "bg-slate-100" : "bg-blue-50"}`}>
        <Calendar className={`w-4 h-4 ${past ? "text-slate-400" : "text-blue-600"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${past ? "text-slate-400 line-through" : "text-slate-800"}`}>
            {event.title}
          </p>
          <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${
            event.visibility === "customer"
              ? "bg-green-50 text-green-600 border border-green-100"
              : "bg-slate-100 text-slate-400"
          }`}>
            {event.visibility === "customer"
              ? <><Eye className="w-2.5 h-2.5" /> Customer</>
              : <><Lock className="w-2.5 h-2.5" /> Internal</>}
          </span>
        </div>
        {event.scheduledAt && (
          <p className="text-xs text-slate-400 mt-0.5">
            {formatDate(event.scheduledAt.toDate())}
          </p>
        )}
        {event.notes && <p className="text-xs text-slate-500 mt-1">{event.notes}</p>}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1 rounded"
          title="Remove event"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
