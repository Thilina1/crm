"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getOpportunities, getAccounts, getReps, STAGE_PROBABILITY } from "@/lib/firestore";
import type { Opportunity } from "@/types";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Plus, TrendingUp, DollarSign, Target, Zap, Search, X } from "lucide-react";

const PIPELINES = [
  { value: "new_sales", label: "New Sales" },
  { value: "renewals",  label: "Renewals"  },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PipelinePage() {
  const [opps, setOpps]             = useState<Opportunity[]>([]);
  const [pipeline, setPipeline]     = useState("new_sales");
  const [loading, setLoading]       = useState(true);
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [repNames, setRepNames]     = useState<Record<string, string>>({});

  // Search + date filters
  const [search, setSearch]         = useState("");
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [monthFilter, setMonthFilter] = useState<number | "">("");

  useEffect(() => {
    Promise.all([getAccounts(), getReps()]).then(([accs, reps]) => {
      setAccountNames(Object.fromEntries(accs.map((a) => [a.id, a.name])));
      setRepNames(Object.fromEntries(reps.map((r) => [r.uid, r.name])));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setSearch("");
    setYearFilter("");
    setMonthFilter("");
    getOpportunities(pipeline).then(setOpps).finally(() => setLoading(false));
  }, [pipeline]);

  // Available years derived from data
  const availableYears = useMemo(() => {
    const years = new Set(opps.map((o) => o.createdAt?.toDate?.().getFullYear()).filter(Boolean) as number[]);
    return [...years].sort((a, b) => b - a);
  }, [opps]);

  // Available months for selected year
  const availableMonths = useMemo(() => {
    if (!yearFilter) return [];
    const months = new Set(
      opps
        .filter((o) => o.createdAt?.toDate?.().getFullYear() === yearFilter)
        .map((o) => o.createdAt?.toDate?.().getMonth())
        .filter((m) => m !== undefined) as number[]
    );
    return [...months].sort((a, b) => a - b);
  }, [opps, yearFilter]);

  // Reset month when year changes
  useEffect(() => { setMonthFilter(""); }, [yearFilter]);

  // Filtered opps passed to board
  const filteredOpps = useMemo(() => {
    return opps.filter((o) => {
      if (search) {
        const name = (accountNames[o.accountId] ?? o.leadName ?? "").toLowerCase();
        if (!name.includes(search.toLowerCase())) return false;
      }
      if (yearFilter !== "") {
        const y = o.createdAt?.toDate?.().getFullYear();
        if (y !== yearFilter) return false;
      }
      if (monthFilter !== "") {
        const m = o.createdAt?.toDate?.().getMonth();
        if (m !== monthFilter) return false;
      }
      return true;
    });
  }, [opps, search, yearFilter, monthFilter, accountNames]);

  const forecast = filteredOpps
    .filter((o) => !["closed_won", "closed_lost"].includes(o.stage))
    .reduce((sum, o) => sum + (o.value ?? 0) * (STAGE_PROBABILITY[o.stage] / 100), 0);
  const won     = filteredOpps.filter((o) => o.stage === "closed_won").reduce((s, o) => s + (o.value ?? 0), 0);
  const open    = filteredOpps.filter((o) => !["closed_won", "closed_lost"].includes(o.stage)).length;
  const stagnant = filteredOpps.filter((o) => o.isStagnant).length;

  const hasFilters = search || yearFilter !== "" || monthFilter !== "";

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>

      {/* ── Non-scrollable header ── */}
      <div className="shrink-0 px-6 pt-5 pb-4 space-y-4">

        {/* Pipeline tabs + New deal */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {PIPELINES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPipeline(p.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pipeline === p.value
                    ? "bg-blue-600 text-white shadow"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link
            href={`/dashboard/pipeline/new?pipeline=${pipeline}`}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New deal
          </Link>
        </div>

        {/* Search + date filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
              placeholder="Search deals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Year */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value === "" ? "" : Number(e.target.value))}
            className="h-9 text-sm bg-white border border-slate-200 rounded-lg px-3 text-slate-600 outline-none cursor-pointer"
          >
            <option value="">All years</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Month — only when a year is selected */}
          <select
            value={monthFilter}
            disabled={yearFilter === ""}
            onChange={(e) => setMonthFilter(e.target.value === "" ? "" : Number(e.target.value))}
            className="h-9 text-sm bg-white border border-slate-200 rounded-lg px-3 text-slate-600 outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">All months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{MONTH_NAMES[m]}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setYearFilter(""); setMonthFilter(""); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Open deals",         value: loading ? "—" : open,                                  icon: Target,    iconBg: "bg-blue-50",   iconColor: "text-blue-600"   },
            { label: "Forecasted revenue", value: loading ? "—" : `$${Math.round(forecast).toLocaleString()}`, icon: TrendingUp, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
            { label: "Closed won",         value: loading ? "—" : `$${won.toLocaleString()}`,            icon: DollarSign, iconBg: "bg-green-50",  iconColor: "text-green-600"  },
            { label: "Stagnant deals",     value: loading ? "—" : stagnant,                              icon: Zap,        iconBg: stagnant > 0 ? "bg-amber-50" : "bg-slate-50", iconColor: stagnant > 0 ? "text-amber-500" : "text-slate-400" },
          ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 leading-none">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable board only ── */}
      <div className="flex-1 min-h-0 px-6 pb-4 overflow-x-auto">
        {loading ? (
          <div className="flex gap-3 h-full">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="min-w-[220px] h-full bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <KanbanBoard
            opportunities={opps}
            filteredOpps={filteredOpps}
            onUpdate={setOpps}
            accountNames={accountNames}
            repNames={repNames}
          />
        )}
      </div>
    </div>
  );
}
