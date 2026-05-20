"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProjects, getProjectsByMember, PROJECT_TYPE_LABELS } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import type { Project } from "@/types";
import { Plus, Search, Briefcase, Calendar, CheckCircle2, Clock } from "lucide-react";
import { formatDate } from "@/lib/date";

const statusColor: Record<string, string> = {
  active:    "bg-blue-50 text-blue-600 border border-blue-100",
  completed: "bg-green-50 text-green-600 border border-green-100",
  overdue:   "bg-red-50 text-red-600 border border-red-100",
  upcoming:  "bg-slate-100 text-slate-500 border border-slate-200",
};

function projectStatus(p: Project): { label: string; key: string } {
  const last = p.stages[p.stages.length - 1];
  if (p.currentStage === last) return { label: "Completed", key: "completed" };
  const now = Date.now();
  const end = p.expectedEndDate?.toMillis?.();
  if (end && end < now) return { label: "Overdue", key: "overdue" };
  const start = p.startDate?.toMillis?.();
  if (start && start > now) return { label: "Upcoming", key: "upcoming" };
  return { label: "Active", key: "active" };
}

export default function ProjectsPage() {
  const { appUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!appUser) return;
    const fetch =
      appUser.role === "customer"
        ? getProjectsByMember(appUser.uid)
        : getProjects();
    fetch.then(setProjects).finally(() => setLoading(false));
  }, [appUser]);

  const filtered = filter
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          p.type.toLowerCase().includes(filter.toLowerCase())
      )
    : projects;

  const counts = {
    active: projects.filter((p) => projectStatus(p).key === "active").length,
    completed: projects.filter((p) => projectStatus(p).key === "completed").length,
    overdue: projects.filter((p) => projectStatus(p).key === "overdue").length,
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {projects.length} total · {counts.active} active · {counts.overdue > 0 ? <span className="text-red-500">{counts.overdue} overdue</span> : "0 overdue"}
        </p>
        {appUser?.role !== "customer" && (
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New project
          </Link>
        )}
      </div>

      {/* Stat chips */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Active", value: counts.active, icon: Clock, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Completed", value: counts.completed, icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-100" },
          { label: "Overdue", value: counts.overdue, icon: Calendar, color: counts.overdue > 0 ? "text-red-600 bg-red-50 border-red-100" : "text-slate-400 bg-slate-50 border-slate-200" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium ${color}`}>
            <Icon className="w-3.5 h-3.5" />
            {value} {label}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5 w-full max-w-xs">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
          placeholder="Search by name or type…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Briefcase className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-slate-400 text-sm">
            {filter ? "No projects match your search." : "No projects yet."}
          </p>
          {!filter && (
            <Link href="/dashboard/projects/new" className="mt-3 text-sm text-blue-600 hover:underline">
              Create your first project →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const { label, key } = projectStatus(project);
            const stageIndex = project.stages.indexOf(project.currentStage);
            const progress = project.stages.length > 1
              ? Math.round((stageIndex / (project.stages.length - 1)) * 100)
              : 100;

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-4 group"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[key]}`}>
                    {label}
                  </span>
                </div>

                {/* Name & type */}
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                    {project.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    {PROJECT_TYPE_LABELS[project.type] ?? project.type}
                  </p>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span className="font-medium text-slate-600">{project.currentStage}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${key === "overdue" ? "bg-red-400" : key === "completed" ? "bg-green-500" : "bg-blue-600"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Stage {stageIndex + 1} of {project.stages.length}
                  </p>
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {project.startDate ? formatDate(project.startDate.toDate()) : "—"}
                  </span>
                  <span>→ {project.expectedEndDate ? formatDate(project.expectedEndDate.toDate()) : "—"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
