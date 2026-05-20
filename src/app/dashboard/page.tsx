"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getLeads } from "@/lib/firestore";
import type { Lead } from "@/types";
import { Users, TrendingUp, CheckCircle, Flame, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/date";

interface Stats {
  total: number;
  hot: number;
  warm: number;
  converted: number;
}

const scorePill: Record<string, string> = {
  hot: "bg-red-50 text-red-600 border border-red-100",
  warm: "bg-amber-50 text-amber-600 border border-amber-100",
  cold: "bg-slate-100 text-slate-500 border border-slate-200",
};

export default function DashboardPage() {
  const { appUser } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, hot: 0, warm: 0, converted: 0 });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeads().then((leads) => {
      setRecentLeads(leads.slice(0, 6));
      setStats({
        total: leads.length,
        hot: leads.filter((l) => l.score === "hot").length,
        warm: leads.filter((l) => l.score === "warm").length,
        converted: leads.filter((l) => l.isConverted).length,
      });
      setLoading(false);
    });
  }, []);

  const statCards = [
    {
      label: "Total Leads",
      value: stats.total,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      change: "+12% this month",
    },
    {
      label: "Hot Leads",
      value: stats.hot,
      icon: Flame,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      change: "Ready to convert",
    },
    {
      label: "Warm Leads",
      value: stats.warm,
      icon: TrendingUp,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      change: "In progress",
    },
    {
      label: "Converted",
      value: stats.converted,
      icon: CheckCircle,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      change: "Accounts created",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Good day{appUser?.name ? `, ${appUser.name.split(" ")[0]}` : ""} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Here's what's happening with your leads today.
          </p>
        </div>
        <Link
          href="/dashboard/leads/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          + New Lead
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, change }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">
                {loading ? <span className="inline-block w-8 h-7 bg-slate-100 rounded animate-pulse" /> : value}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
            </div>
            <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">{change}</p>
          </div>
        ))}
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Recent Leads</h3>
          <Link
            href="/dashboard/leads"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : recentLeads.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-sm">
            No leads yet.{" "}
            <Link href="/dashboard/leads/new" className="text-blue-600 hover:underline">
              Create your first lead →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentLeads.map((lead) => {
              const initials = lead.fullName
                .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <li key={lead.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-blue-600 truncate block"
                    >
                      {lead.fullName}
                    </Link>
                    <p className="text-xs text-slate-400 truncate capitalize">
                      {lead.source} · {lead.productInterest}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${scorePill[lead.score]}`}>
                      {lead.score}
                    </span>
                    <span className="text-xs text-slate-400">
                      {lead.createdAt ? formatDistanceToNow(lead.createdAt.toDate()) : "—"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
