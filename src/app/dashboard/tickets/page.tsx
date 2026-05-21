"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTickets, getProjects } from "@/lib/firestore";
import type { Ticket, TicketStatus, TicketPriority, Project } from "@/types";
import { Plus, Search, Pencil } from "lucide-react";
import { formatDate } from "@/lib/date";

// ─── Style maps ───────────────────────────────────────────────────────────────

const priorityPill: Record<TicketPriority, string> = {
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

const sourceIcon: Record<string, string> = {
  portal:   "🖥",
  call:     "📞",
  internal: "🔒",
};

const STATUS_TABS: { label: string; value: TicketStatus | "all" }[] = [
  { label: "All",        value: "all" },
  { label: "Open",       value: "open" },
  { label: "In Progress",value: "in_progress" },
  { label: "Awaiting",   value: "awaiting_customer" },
  { label: "Resolved",   value: "resolved" },
  { label: "Closed",     value: "closed" },
];

const PRIORITY_TABS: { label: string; value: TicketPriority | "all" }[] = [
  { label: "All",    value: "all" },
  { label: "Low",    value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High",   value: "high" },
  { label: "Urgent", value: "urgent" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusTab, setStatusTab]       = useState<TicketStatus | "all">("all");
  const [priorityTab, setPriorityTab]   = useState<TicketPriority | "all">("all");

  useEffect(() => {
    Promise.all([getTickets(), getProjects()]).then(([tkts, projs]) => {
      setTickets(tkts);
      const map: Record<string, string> = {};
      projs.forEach((p: Project) => { map[p.id] = p.name; });
      setProjectMap(map);
    }).finally(() => setLoading(false));
  }, []);

  // Stats
  const openCount       = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const highUrgentCount = tickets.filter((t) => t.priority === "high" || t.priority === "urgent").length;
  const resolvedCount   = tickets.filter((t) => t.status === "resolved").length;

  // Filtered
  const filtered = tickets.filter((t) => {
    if (statusTab !== "all" && t.status !== statusTab) return false;
    if (priorityTab !== "all" && t.priority !== priorityTab) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{tickets.length} total tickets</p>
        </div>
        <Link
          href="/dashboard/tickets/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New ticket
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Open",        value: openCount,       color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "In Progress", value: inProgressCount, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "High / Urgent", value: highUrgentCount, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Resolved",    value: resolvedCount,   color: "text-green-600",  bg: "bg-green-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 shadow-sm px-2 py-1.5 w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusTab(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusTab === tab.value
                  ? "bg-indigo-600 text-white"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Priority pills + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            {PRIORITY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setPriorityTab(tab.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  priorityTab === tab.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 w-64 ml-auto">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
              placeholder="Search tickets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due</th>
              <th className="px-4 py-3.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-slate-400">
                  {search || statusTab !== "all" || priorityTab !== "all"
                    ? "No tickets match your filters."
                    : (
                      <>
                        No tickets yet.{" "}
                        <Link href="/dashboard/tickets/new" className="text-blue-600 hover:underline">
                          Create the first one →
                        </Link>
                      </>
                    )}
                </td>
              </tr>
            ) : (
              filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                    TKT-{ticket.id.slice(0, 6).toUpperCase()}
                  </td>
                  <td className="px-4 py-3.5 max-w-xs">
                    <p className="font-medium text-slate-900 truncate">{ticket.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{ticket.description}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-sm">
                    {ticket.projectId ? (projectMap[ticket.projectId] ?? <span className="text-slate-300">—</span>) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${priorityPill[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusPill[ticket.status]}`}>
                      {statusLabel[ticket.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    <span title={ticket.source}>{sourceIcon[ticket.source] ?? ticket.source}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">
                    {ticket.dueDate ? formatDate(ticket.dueDate.toDate()) : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/dashboard/tickets/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
