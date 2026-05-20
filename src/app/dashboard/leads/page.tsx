"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLeads } from "@/lib/firestore";
import type { Lead } from "@/types";
import { Plus, Search, Pencil } from "lucide-react";
import { formatDistanceToNow } from "@/lib/date";

const scorePill: Record<string, string> = {
  hot: "bg-red-50 text-red-600 border border-red-100",
  warm: "bg-amber-50 text-amber-600 border border-amber-100",
  cold: "bg-slate-100 text-slate-500 border border-slate-200",
};

const stagePill: Record<string, string> = {
  cold: "bg-slate-100 text-slate-500 border border-slate-200",
  warm: "bg-amber-50 text-amber-600 border border-amber-100",
  confirmed: "bg-green-50 text-green-600 border border-green-100",
  converted: "bg-blue-50 text-blue-600 border border-blue-100",
};

const sourceIcon: Record<string, string> = {
  call: "📞",
  whatsapp: "💬",
  web: "🌐",
  facebook: "📘",
  import: "📂",
  api: "⚡",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    getLeads()
      .then(setLeads)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? leads.filter(
        (l) =>
          l.fullName.toLowerCase().includes(filter.toLowerCase()) ||
          l.phone.includes(filter) ||
          l.email?.toLowerCase().includes(filter.toLowerCase())
      )
    : leads;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {leads.length} total · {leads.filter((l) => l.score === "hot").length} hot
          </p>
        </div>
        <Link
          href="/dashboard/leads/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New lead
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5 w-full max-w-xs">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
          placeholder="Search name, phone, email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Added</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-400">
                  {filter ? "No results match your search." : (
                    <>
                      No leads yet.{" "}
                      <Link href="/dashboard/leads/new" className="text-blue-600 hover:underline">
                        Create the first one →
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const initials = lead.fullName
                  .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {initials}
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {lead.fullName}
                          </Link>
                          {lead.email && (
                            <p className="text-xs text-slate-400 mt-0.5">{lead.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{lead.phone}</td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span>{sourceIcon[lead.source] ?? "•"}</span>
                        <span className="capitalize">{lead.source}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{lead.productInterest}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${scorePill[lead.score]}`}>
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${stagePill[lead.stage]}`}>
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {lead.createdAt ? formatDistanceToNow(lead.createdAt.toDate()) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/dashboard/leads/${lead.id}?edit=1`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
