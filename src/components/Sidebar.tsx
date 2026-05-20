"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Users,
  UserCheck,
  Briefcase,
  FolderKanban,
  Ticket,
  BarChart2,
  LogOut,
  LayoutDashboard,
  Zap,
  ChevronRight,
  CircleUser,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard",  href: "/dashboard",          icon: LayoutDashboard },
  { label: "Leads",      href: "/dashboard/leads",     icon: Users },
  { label: "Accounts",   href: "/dashboard/accounts",  icon: UserCheck },
  { label: "Pipeline",   href: "/dashboard/pipeline",  icon: FolderKanban },
  { label: "Projects",   href: "/dashboard/projects",  icon: Briefcase },
  { label: "Tickets",    href: "/dashboard/tickets",   icon: Ticket },
  { label: "Reports",    href: "/dashboard/reports",   icon: BarChart2 },
  { label: "Profile",    href: "/dashboard/profile",   icon: CircleUser },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { appUser, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    router.push("/login");
  }

  const initials = appUser?.name
    ? appUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const visibleNav =
    appUser?.role === "customer"
      ? navItems.filter((item) => item.href === "/dashboard/projects" || item.href === "/dashboard/profile")
      : navItems;

  return (
    <aside
      className="flex flex-col w-60 shrink-0 h-screen sticky top-0 text-white relative overflow-hidden"
      style={{ background: "linear-gradient(175deg, #07091c 0%, #0c1140 45%, #09102e 100%)" }}
    >
      {/* Ambient top glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      {/* Ambient bottom glow */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-48 h-40 bg-violet-700/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="relative h-16 flex items-center gap-3 px-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/50"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-extrabold text-base tracking-tight text-white">NexDesk</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
            CRM
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 py-5 px-3 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20 px-3 mb-3">
          Main menu
        </p>

        {visibleNav.map(({ label, href, icon: Icon }) => {
          const active = href === "/dashboard"
            ? pathname === href
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-200 relative",
                active
                  ? "text-white"
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
            >
              {/* Active background */}
              {active && (
                <span
                  className="absolute inset-0 rounded-xl opacity-100"
                  style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.20) 100%)",
                    border: "1px solid rgba(99,102,241,0.25)",
                    boxShadow: "0 0 20px rgba(99,102,241,0.15)",
                  }}
                />
              )}
              {/* Left accent line */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-indigo-400 shadow-lg shadow-indigo-400/50" />
              )}

              <Icon className={cn("w-4 h-4 shrink-0 relative z-10", active ? "text-indigo-300" : "")} />
              <span className="relative z-10 flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 relative z-10 text-indigo-400/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="relative border-t border-white/[0.06] px-3 py-4">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-md"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/90 truncate">{appUser?.name ?? "User"}</p>
            <p className="text-xs text-white/30 capitalize">{appUser?.role ?? "rep"}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-white/25 hover:text-white/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
