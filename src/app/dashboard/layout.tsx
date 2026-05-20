"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Bell, Search } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard":          "Dashboard",
  "/dashboard/leads":    "Leads",
  "/dashboard/accounts": "Accounts",
  "/dashboard/pipeline": "Pipeline",
  "/dashboard/projects": "Projects",
  "/dashboard/tickets":  "Tickets",
  "/dashboard/reports":  "Reports",
  "/dashboard/profile":  "Profile",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, appUser, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) { router.replace("/login"); return; }
    // Customers only have access to the projects section
    if (
      appUser?.role === "customer" &&
      !pathname.startsWith("/dashboard/projects") &&
      !pathname.startsWith("/dashboard/profile")
    ) {
      router.replace("/dashboard/projects");
    }
  }, [firebaseUser, appUser, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #07091c 0%, #0c1140 100%)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-white/40">Loading NexDesk…</span>
        </div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  const pageTitle =
    Object.entries(pageTitles).find(([key]) => pathname === key || pathname.startsWith(key + "/"))?.[1]
    ?? "NexDesk";

  const initials = appUser?.name
    ? appUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="flex min-h-screen relative" style={{ background: "#f3f4fb" }}>
      {/* Fixed ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-60 right-0 w-[700px] h-[700px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%)" }} />
      </div>

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Glass top bar */}
        <header
          className="h-16 flex items-center px-6 gap-4 shrink-0 sticky top-0 z-20"
          style={{
            background: "rgba(243,244,251,0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(99,102,241,0.08)",
            boxShadow: "0 1px 20px rgba(99,102,241,0.06)",
          }}
        >
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-none">{pageTitle}</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">NexDesk CRM</p>
          </div>

          <div className="flex-1" />

          {/* Search pill */}
          <div
            className="hidden md:flex items-center gap-2 px-3 py-2 w-56 text-sm text-slate-400 cursor-pointer transition-all hover:shadow-md"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(99,102,241,0.12)",
              borderRadius: "10px",
            }}
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
            <span className="text-xs">Search…</span>
            <kbd className="ml-auto text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-400">⌘K</kbd>
          </div>

          {/* Notifications */}
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:shadow-md"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(99,102,241,0.12)",
            }}
          >
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full shadow-sm shadow-indigo-400/50"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} />
          </button>

          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-md shadow-indigo-400/20 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {initials}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
