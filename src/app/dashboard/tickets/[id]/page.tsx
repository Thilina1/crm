"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTicket,
  getTicketComments,
  updateTicket,
  createTicketComment,
  getLeads,
  getReps,
  getProjects,
} from "@/lib/firestore";
import type { Ticket, TicketComment, TicketStatus, Lead, AppUser, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/date";

// ─── Style maps ───────────────────────────────────────────────────────────────

const priorityPill: Record<string, string> = {
  urgent: "bg-red-50 text-red-600 border border-red-100",
  high:   "bg-amber-50 text-amber-600 border border-amber-100",
  medium: "bg-blue-50 text-blue-600 border border-blue-100",
  low:    "bg-slate-100 text-slate-500 border border-slate-200",
};

const statusPill: Record<TicketStatus, string> = {
  open:              "bg-blue-50 text-blue-600 border border-blue-100",
  in_progress:       "bg-violet-50 text-violet-600 border border-violet-100",
  awaiting_customer: "bg-amber-50 text-amber-600 border border-amber-100",
  resolved:          "bg-green-50 text-green-600 border border-green-100",
  closed:            "bg-slate-100 text-slate-500 border border-slate-200",
};

const statusLabel: Record<TicketStatus, string> = {
  open:              "Open",
  in_progress:       "In Progress",
  awaiting_customer: "Awaiting",
  resolved:          "Resolved",
  closed:            "Closed",
};

const STATUS_ACTIONS: TicketStatus[] = [
  "open",
  "in_progress",
  "awaiting_customer",
  "resolved",
  "closed",
];

const sourceIcon: Record<string, string> = {
  portal:   "🖥",
  call:     "📞",
  internal: "🔒",
};

// ─── Detail grid row ──────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800">{value ?? <span className="text-slate-300">—</span>}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const { appUser } = useAuth();

  const [ticket, setTicket]       = useState<Ticket | null>(null);
  const [comments, setComments]   = useState<TicketComment[]>([]);
  const [leadMap, setLeadMap]     = useState<Record<string, string>>({});
  const [repMap, setRepMap]       = useState<Record<string, string>>({});
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);

  // Comment form
  const [body, setBody]           = useState("");
  const [isInternal, setInternal] = useState(false);
  const [posting, setPosting]     = useState(false);

  // Status change
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getTicket(id),
      getTicketComments(id),
      getLeads(),
      getReps(),
    ]).then(([tkts, cmts, leads, reps]) => {
      setTicket(tkts);
      setComments(cmts);

      const lm: Record<string, string> = {};
      leads.forEach((l: Lead) => { lm[l.id] = l.fullName; });
      setLeadMap(lm);

      const rm: Record<string, string> = {};
      reps.forEach((r: AppUser) => { rm[r.uid] = r.name; });
      setRepMap(rm);

      if (tkts?.accountId) {
        getProjects(tkts.accountId).then((projs: Project[]) => {
          const pm: Record<string, string> = {};
          projs.forEach((p) => { pm[p.id] = p.name; });
          setProjectMap(pm);
        });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(status: TicketStatus) {
    if (!ticket || ticket.status === status) return;
    setStatusLoading(true);
    try {
      await updateTicket(id, { status });
      setTicket((t) => t && { ...t, status });
      toast.success(`Status updated to ${statusLabel[status]}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  }

  async function handlePostComment(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    if (!appUser) { toast.error("Not authenticated"); return; }
    setPosting(true);
    try {
      const newId = await createTicketComment(id, {
        authorId:   appUser.uid,
        authorRole: appUser.role,
        body:       body.trim(),
        isInternal,
      });
      const newComment: TicketComment = {
        id:         newId,
        ticketId:   id,
        authorId:   appUser.uid,
        authorRole: appUser.role,
        body:       body.trim(),
        isInternal,
        createdAt:  { toDate: () => new Date() } as never,
      };
      setComments((c) => [...c, newComment]);
      setBody("");
      setInternal(false);
      toast.success("Comment added");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!ticket) {
    return <div className="p-6 text-sm text-slate-400">Ticket not found.</div>;
  }

  const ref         = `TKT-${id.slice(0, 6).toUpperCase()}`;
  const leadName    = leadMap[ticket.accountId];
  const repName     = repMap[ticket.assignedRep];
  const projectName = ticket.projectId ? projectMap[ticket.projectId] : undefined;

  return (
    <div className="p-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/tickets")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to tickets
      </button>

      {/* ── 1. Header card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0a0f1e] to-[#0f1f40] px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 font-mono mb-1">{ref}</p>
              <h1 className="text-xl font-bold text-white leading-tight">{ticket.title}</h1>
              <p className="text-sm text-white/50 mt-1.5">
                {sourceIcon[ticket.source]} {ticket.source}
                {projectName && <> · {projectName}</>}
                {ticket.dueDate && <> · Due {formatDate(ticket.dueDate.toDate())}</>}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${priorityPill[ticket.priority]}`}>
                {ticket.priority}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusPill[ticket.status]}`}>
                {statusLabel[ticket.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Status quick-change */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Status:</span>
          {STATUS_ACTIONS.map((s) => (
            <button
              key={s}
              disabled={statusLoading}
              onClick={() => handleStatusChange(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                ticket.status === s
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Details card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-sm font-semibold text-slate-700">Details</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-5">
          <DetailRow label="Project"      value={projectName} />
          <DetailRow label="Assigned Rep" value={repName} />
          <DetailRow label="Lead"         value={leadName} />
          <DetailRow label="Source"       value={ticket.source} />
          <DetailRow label="Due Date"     value={ticket.dueDate ? formatDate(ticket.dueDate.toDate()) : undefined} />
          <DetailRow label="Created At"   value={ticket.createdAt ? formatDate(ticket.createdAt.toDate()) : undefined} />
          <div className="col-span-2 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</p>
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
          </div>
        </div>
      </div>

      {/* ── 3. Comments card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-sm font-semibold text-slate-700">
            Comments{comments.length > 0 && <span className="ml-1.5 text-slate-400">({comments.length})</span>}
          </h2>
        </div>

        {/* Thread */}
        <div className="divide-y divide-slate-100">
          {comments.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400 text-center">No comments yet. Be the first to add one.</p>
          ) : (
            comments.map((c) => {
              const authorName = repMap[c.authorId] ?? c.authorId;
              const initials   = authorName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div key={c.id} className={`px-5 py-4 ${c.isInternal ? "bg-amber-50/40" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800">{authorName}</span>
                        {c.isInternal && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                            🔒 Internal
                          </span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">
                          {c.createdAt ? formatDate(c.createdAt.toDate()) : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add comment form */}
        <div className="px-5 py-5 border-t border-slate-100 bg-slate-50/30">
          <form onSubmit={handlePostComment} className="space-y-3">
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="bg-white border-slate-200 resize-none"
              placeholder="Add a comment…"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setInternal(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-amber-500"
                />
                <span className="text-xs font-medium text-slate-600">Internal note (staff only)</span>
              </label>
              <Button
                type="submit"
                disabled={posting || !body.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 h-9 rounded-lg text-sm font-medium"
              >
                {posting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Posting…
                  </span>
                ) : "Post comment"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
