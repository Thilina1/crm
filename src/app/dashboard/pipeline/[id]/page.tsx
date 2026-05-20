"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getOpportunity,
  getAccount,
  getUser,
  updateOpportunity,
  STAGE_LABELS,
  STAGE_PROBABILITY,
  updateOpportunityStage,
  PIPELINE_STAGES,
  provisionCustomerLogin,
} from "@/lib/firestore";
import type { Opportunity, OpportunityStage, LossReason } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WinLossDialog } from "@/components/WinLossDialog";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { toast } from "sonner";
import {
  ArrowLeft, DollarSign, TrendingUp, Trophy, XCircle,
  Clock, AlertTriangle, User, Calendar, CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/date";

const LOSS_REASON_LABELS: Record<string, string> = {
  price_too_high: "Price too high",
  chose_competitor: "Chose a competitor",
  went_silent: "Customer went silent",
  requirements_changed: "Requirements changed",
  other: "Other",
};

const ACTIVE_STAGES = PIPELINE_STAGES.filter((s) => s !== "closed_lost");

/* ── Shared glass card style ─────────────────────────────────────────── */
const glass = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.8)",
  boxShadow: "0 4px 32px rgba(99,102,241,0.06), 0 1px 4px rgba(0,0,0,0.04)",
} as React.CSSProperties;

export default function OpportunityDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [opp, setOpp]             = useState<Opportunity | null>(null);
  const [loading, setLoading]     = useState(true);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving]       = useState(false);
  const [showLoss, setShowLoss]   = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [pendingStage, setPendingStage] = useState<OpportunityStage | null>(null);
  const [accountName, setAccountName]   = useState("");
  const [repName, setRepName]           = useState("");

  useEffect(() => {
    getOpportunity(id).then((o) => {
      setOpp(o);
      setEditValue(o?.value?.toString() ?? "");
      setLoading(false);
      if (o) {
        getAccount(o.accountId).then((a) => setAccountName(a?.name ?? o.accountId));
        getUser(o.assignedRep).then((u) => setRepName(u?.name ?? o.assignedRep));
      }
    });
  }, [id]);

  async function handleStageChange(stage: OpportunityStage) {
    if (!opp) return;
    if (stage === "closed_lost") {
      setPendingStage(stage);
      setShowLoss(true);
      return;
    }
    const updated = { ...opp, stage, probability: STAGE_PROBABILITY[stage], isStagnant: false };
    setOpp(updated);
    await updateOpportunityStage(id, stage);
    if (stage === "closed_won") {
      toast.success("Deal marked as won! 🎉");
      setShowCreateProject(true);
      provisionCustomerLogin(opp.accountId).then((result) => {
        if (result.success) {
          toast.success(
            result.isNew
              ? `Customer login created — ${result.email} / 1234567890`
              : `Customer login reset — ${result.email} / 1234567890`,
            { duration: 8000 }
          );
        } else if (result.error === "no_email") {
          toast.warning("No email on account — add one to create a customer login.");
        }
      });
    } else {
      toast.success(`Moved to ${STAGE_LABELS[stage]}`);
    }
  }

  async function handleLossConfirm(reason: LossReason, notes: string) {
    if (!opp || !pendingStage) return;
    setShowLoss(false);
    setOpp({ ...opp, stage: "closed_lost" as OpportunityStage, probability: 0 });
    await updateOpportunityStage(id, "closed_lost", { lossReason: reason, lossNotes: notes });
    setPendingStage(null);
    toast.error("Deal marked as lost.");
  }

  async function saveValue() {
    if (!opp) return;
    setSaving(true);
    const value = parseFloat(editValue) || 0;
    await updateOpportunity(id, { value });
    setOpp({ ...opp, value });
    toast.success("Deal value updated");
    setSaving(false);
  }

  /* ── Skeleton ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="p-6  space-y-4">
        <div className="h-5 w-32 bg-white/50 rounded-full animate-pulse" />
        <div className="h-52 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.4)" }} />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.4)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!opp) return <div className="p-6 text-sm text-slate-400">Deal not found.</div>;

  const daysInStage = opp.lastMovedAt
    ? Math.floor((Date.now() - opp.lastMovedAt.toMillis()) / 86_400_000)
    : 0;

  const isClosed        = ["closed_won", "closed_lost"].includes(opp.stage);
  const activeStageIndex = ACTIVE_STAGES.findIndex((s) => s === opp.stage);

  return (
    <div className="p-6  space-y-5">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to pipeline
      </button>

      {/* ── Hero card ──────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 8px 48px rgba(99,102,241,0.18), 0 2px 8px rgba(0,0,0,0.12)" }}>
        {/* Background gradient */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #07091c 0%, #0f1245 50%, #120a35 100%)" }} />
        {/* Glow orbs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)" }} />
        {/* Glass shine strip */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }} />

        <div className="relative px-7 py-7">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400/80 mb-3">
                <span className="w-1 h-1 rounded-full bg-indigo-400" />
                {opp.pipeline.replace("_", " ")} pipeline
              </span>
              <h1 className="text-2xl font-extrabold text-white leading-tight tracking-tight">
                {accountName || opp.accountId}
              </h1>
            </div>

            {opp.stage === "closed_won" && (
              <div className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full shrink-0"
                style={{
                  background: "rgba(16,185,129,0.15)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  color: "#6ee7b7",
                  boxShadow: "0 0 16px rgba(16,185,129,0.12)",
                }}>
                <Trophy className="w-3.5 h-3.5" /> Deal Won
              </div>
            )}
            {opp.stage === "closed_lost" && (
              <div className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full shrink-0"
                style={{
                  background: "rgba(244,63,94,0.15)",
                  border: "1px solid rgba(244,63,94,0.3)",
                  color: "#fda4af",
                  boxShadow: "0 0 16px rgba(244,63,94,0.1)",
                }}>
                <XCircle className="w-3.5 h-3.5" /> Deal Lost
              </div>
            )}
          </div>

          {/* Stat pills row */}
          <div className="flex flex-wrap gap-2">
            {[
              {
                icon: DollarSign,
                label: "Value",
                value: `$${(opp.value ?? 0).toLocaleString()}`,
                color: "rgba(99,102,241,0.25)",
                iconColor: "#a5b4fc",
              },
              {
                icon: TrendingUp,
                label: "Probability",
                value: `${opp.probability}%`,
                color: "rgba(139,92,246,0.25)",
                iconColor: "#c4b5fd",
              },
              {
                icon: Clock,
                label: "In stage",
                value: `${daysInStage}d`,
                color: "rgba(245,158,11,0.2)",
                iconColor: "#fcd34d",
              },
              ...(repName ? [{
                icon: User,
                label: "Rep",
                value: repName,
                color: "rgba(255,255,255,0.08)",
                iconColor: "#94a3b8",
              }] : []),
            ].map(({ icon: Icon, label, value, color, iconColor }) => (
              <div key={label}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: color, border: "1px solid rgba(255,255,255,0.08)" }}>
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
                <div>
                  <p className="text-[10px] text-white/40 leading-none">{label}</p>
                  <p className="text-sm font-bold text-white mt-0.5 leading-none">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stagnant alert ─────────────────────────────────────────────── */}
      {opp.isStagnant && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
          style={{
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.2)",
            backdropFilter: "blur(12px)",
          }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(251,191,36,0.15)" }}>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">Deal is stagnant</p>
            <p className="text-xs text-amber-400/70 mt-0.5">No movement in {daysInStage} days — time to follow up.</p>
          </div>
        </div>
      )}

      {/* ── Stage stepper ──────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={glass}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Pipeline progress</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isClosed
                ? opp.stage === "closed_won" ? "Deal successfully closed" : "Deal closed as lost"
                : `Currently in ${STAGE_LABELS[opp.stage]}`}
            </p>
          </div>
          {opp.stage === "closed_lost" && (
            <span className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
              Closed Lost
            </span>
          )}
          {opp.stage === "closed_won" && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Won
            </span>
          )}
        </div>

        <div className="px-6 py-6">
          <div className="flex items-start">
            {ACTIVE_STAGES.map((s, i) => {
              const isPast   = i < activeStageIndex;
              const isActive = activeStageIndex === i && !isClosed;
              const isFuture = i > activeStageIndex;
              return (
                <div key={s} className="flex-1 flex flex-col items-center relative">
                  {/* Connector */}
                  {i > 0 && (
                    <div className="absolute top-3.5 right-1/2 w-full h-0.5 -translate-y-1/2 rounded-full"
                      style={{
                        background: isPast || isActive
                          ? "linear-gradient(90deg, #6366f1, #818cf8)"
                          : "rgba(99,102,241,0.1)",
                      }} />
                  )}
                  {/* Dot */}
                  <div className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={
                      isActive ? {
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        boxShadow: "0 0 0 4px rgba(99,102,241,0.15), 0 4px 12px rgba(99,102,241,0.4)",
                      } : isPast ? {
                        background: "linear-gradient(135deg, #6366f1, #818cf8)",
                      } : {
                        background: "rgba(99,102,241,0.08)",
                        border: "2px solid rgba(99,102,241,0.15)",
                      }
                    }>
                    {isPast
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      : isActive
                      ? <div className="w-2 h-2 rounded-full bg-white" />
                      : <div className="w-2 h-2 rounded-full" style={{ background: "rgba(99,102,241,0.3)" }} />
                    }
                  </div>
                  {/* Label */}
                  <p className="text-center text-[10px] leading-tight font-semibold mt-2 px-1"
                    style={{
                      color: isActive ? "#6366f1" : isPast ? "#94a3b8" : isFuture ? "#cbd5e1" : "#64748b",
                    }}>
                    {STAGE_LABELS[s]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Move stage */}
        {!isClosed && (
          <div className="px-5 pb-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Move to stage</p>
            <Select value={opp.stage} onValueChange={(v) => handleStageChange(v as OpportunityStage)}>
              <SelectTrigger className="h-10 w-full"
                style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.12)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loss reason */}
        {opp.stage === "closed_lost" && opp.lossReason && (
          <div className="px-5 pb-5 pt-4" style={{ borderTop: "1px solid rgba(99,102,241,0.08)" }}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Loss reason</p>
            <p className="text-sm font-semibold text-slate-800">
              {LOSS_REASON_LABELS[opp.lossReason] ?? opp.lossReason}
            </p>
            {opp.lossNotes && (
              <p className="text-sm text-slate-500 mt-2 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.08)" }}>
                {opp.lossNotes}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Deal value + Details ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Value editor */}
        <div className="rounded-2xl overflow-hidden" style={glass}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
            <h2 className="text-sm font-bold text-slate-800">Deal value</h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="relative">
              <DollarSign className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                disabled={isClosed}
                className="pl-9 h-10 bg-white/60 border-indigo-100 focus:border-indigo-300"
              />
            </div>
            {!isClosed && (
              <Button
                onClick={saveValue}
                disabled={saving}
                className="w-full h-9 text-sm text-white font-semibold"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none" }}
              >
                {saving ? "Saving…" : "Update value"}
              </Button>
            )}
          </div>
        </div>

        {/* Meta details */}
        <div className="rounded-2xl overflow-hidden" style={glass}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
            <h2 className="text-sm font-bold text-slate-800">Details</h2>
          </div>
          <div className="p-5 space-y-4">
            {[
              { icon: Calendar, label: "Created", value: opp.createdAt ? formatDate(opp.createdAt.toDate()) : "—" },
              { icon: Clock,    label: "Updated", value: opp.updatedAt ? formatDate(opp.updatedAt.toDate()) : "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(99,102,241,0.08)" }}>
                  <Icon className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WinLossDialog
        open={showLoss}
        onConfirm={handleLossConfirm}
        onCancel={() => { setShowLoss(false); setPendingStage(null); }}
      />
      <CreateProjectDialog
        opportunity={opp}
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />
    </div>
  );
}
