"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import type { Opportunity, OpportunityStage, LossReason } from "@/types";
import { STAGE_LABELS, STAGE_PROBABILITY, updateOpportunityStage, provisionCustomerLogin, convertLeadAndProvision } from "@/lib/firestore";
import { WinLossDialog } from "./WinLossDialog";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { toast } from "sonner";
import { AlertTriangle, DollarSign, Clock, Trophy, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

const CARDS_PER_PAGE = 5;

// ─── Card ─────────────────────────────────────────────────────────────────────

function DealCard({
  opp,
  isDragging = false,
  accountNames = {},
  repNames = {},
}: {
  opp: Opportunity;
  isDragging?: boolean;
  accountNames?: Record<string, string>;
  repNames?: Record<string, string>;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: opp.id,
    data: { opp },
    disabled: ["closed_won", "closed_lost"].includes(opp.stage),
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const daysInStage = opp.lastMovedAt
    ? Math.floor((Date.now() - opp.lastMovedAt.toMillis()) / 86_400_000)
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-xl border p-3.5 shadow-sm select-none transition-shadow ${
        isDragging ? "opacity-40" : "cursor-grab active:cursor-grabbing hover:shadow-md"
      } ${opp.isStagnant ? "border-amber-300" : "border-slate-200"}`}
    >
      {opp.isStagnant && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mb-2">
          <AlertTriangle className="w-3 h-3" />
          Stagnant — {daysInStage}d in stage
        </div>
      )}
      <p className="text-sm font-semibold text-slate-900 leading-snug truncate">
        {accountNames[opp.accountId] || opp.leadName || opp.accountId}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <DollarSign className="w-3 h-3" />{opp.value?.toLocaleString() ?? "—"}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />{daysInStage}d
        </span>
      </div>
      {repNames[opp.assignedRep] && (
        <p className="text-xs text-slate-400 mt-1.5 truncate">Rep: {repNames[opp.assignedRep]}</p>
      )}
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {STAGE_PROBABILITY[opp.stage]}%
        </span>
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function StageColumn({
  stage, opps, activeId, accountNames, repNames,
}: {
  stage: OpportunityStage;
  opps: Opportunity[];
  activeId: string | null;
  accountNames: Record<string, string>;
  repNames: Record<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const [page, setPage] = useState(0);

  // Reset to first page when opps list changes (filter / drag)
  useEffect(() => { setPage(0); }, [opps.length]);

  const totalPages  = Math.ceil(opps.length / CARDS_PER_PAGE);
  const visibleOpps = opps.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);
  const totalValue  = opps.reduce((s, o) => s + (o.value ?? 0), 0);

  const colStyle: Record<string, string> = {
    closed_won:    "border-t-green-500",
    closed_lost:   "border-t-red-400",
    new_lead:      "border-t-slate-400",
    proposal_sent: "border-t-blue-400",
    negotiation:   "border-t-violet-500",
    verbal_agree:  "border-t-amber-500",
  };

  const colIcon: Record<string, React.ReactNode> = {
    closed_won:  <Trophy   className="w-3.5 h-3.5 text-green-500" />,
    closed_lost: <XCircle  className="w-3.5 h-3.5 text-red-400"   />,
  };

  return (
    <div className="flex flex-col min-w-[220px] max-w-[220px]">
      {/* Header */}
      <div className={`bg-white rounded-xl border-t-2 ${colStyle[stage] ?? "border-t-slate-300"} border border-slate-200 px-3 py-2.5 mb-2 shadow-sm shrink-0`}>
        <div className="flex items-center gap-1.5">
          {colIcon[stage]}
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {STAGE_LABELS[stage]}
          </span>
          <span className="ml-auto text-xs font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
            {opps.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-slate-400 mt-1">${totalValue.toLocaleString()} total</p>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] rounded-xl p-2 space-y-2 transition-colors overflow-y-auto ${
          isOver ? "bg-blue-50 ring-2 ring-blue-200 ring-inset" : "bg-slate-100/50"
        }`}
      >
        {visibleOpps.map((opp) => (
          <DealCard key={opp.id} opp={opp} isDragging={opp.id === activeId} accountNames={accountNames} repNames={repNames} />
        ))}
        {visibleOpps.length === 0 && !isOver && (
          <p className="text-xs text-slate-400 text-center pt-6">
            {opps.length === 0 ? "Drop here" : "No cards on this page"}
          </p>
        )}
      </div>

      {/* Per-column pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-1.5 px-1">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-slate-400">{page + 1} / {totalPages}</span>
          <button
            disabled={page === totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

interface Props {
  opportunities: Opportunity[];
  filteredOpps: Opportunity[];
  onUpdate: (opps: Opportunity[]) => void;
  accountNames?: Record<string, string>;
  repNames?: Record<string, string>;
}

export function KanbanBoard({ opportunities, filteredOpps, onUpdate, accountNames = {}, repNames = {} }: Props) {
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [lossDialog, setLossDialog] = useState<{ id: string } | null>(null);
  const [pendingStage, setPendingStage] = useState<{ id: string; stage: OpportunityStage } | null>(null);
  const [wonOpp, setWonOpp]         = useState<Opportunity | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeOpp = opportunities.find((o) => o.id === activeId);

  const stages: OpportunityStage[] = [
    "new_lead", "proposal_sent", "negotiation", "verbal_agree", "closed_won", "closed_lost",
  ];

  const byStage = Object.fromEntries(
    stages.map((s) => [s, filteredOpps.filter((o) => o.stage === s)])
  ) as Record<OpportunityStage, Opportunity[]>;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const opp      = opportunities.find((o) => o.id === active.id);
    const newStage = over.id as OpportunityStage;
    if (!opp || opp.stage === newStage) return;
    if (newStage === "closed_lost") {
      setPendingStage({ id: opp.id, stage: newStage });
      setLossDialog({ id: opp.id });
      return;
    }
    await commitStageChange(opp.id, newStage);
  }

  async function commitStageChange(
    id: string,
    stage: OpportunityStage,
    extra?: { lossReason?: LossReason; lossNotes?: string }
  ) {
    const opp = opportunities.find((o) => o.id === id);
    onUpdate(
      opportunities.map((o) =>
        o.id === id ? { ...o, stage, probability: STAGE_PROBABILITY[stage], isStagnant: false } : o
      )
    );
    try {
      await updateOpportunityStage(id, stage, extra);
      if (stage === "closed_won") {
        toast.success("Deal marked as won! 🎉");
        if (opp) {
          setWonOpp({ ...opp, stage, probability: STAGE_PROBABILITY[stage] });
          if (opp.leadId) {
            convertLeadAndProvision(opp.leadId, id).then((result) => {
              if (!result.success) toast.error(result.error ?? "Failed to create account");
              else if (result.noEmail) toast.warning("Account created — no email on lead, add one to enable customer login.");
              else toast.success(result.isNew ? `Account created & login provisioned — ${result.email} / 1234567890` : `Account updated & login reset — ${result.email} / 1234567890`, { duration: 8000 });
            });
          } else {
            provisionCustomerLogin(opp.accountId).then((result) => {
              if (result.success) toast.success(result.isNew ? `Customer login created — ${result.email} / 1234567890` : `Customer login reset — ${result.email} / 1234567890`, { duration: 8000 });
              else if (result.error === "no_email") toast.warning("No email on account — add one to create a customer login.");
            });
          }
        }
      } else if (stage === "closed_lost") {
        toast.error("Deal marked as lost.");
      } else {
        toast.success(`Moved to ${STAGE_LABELS[stage]}`);
      }
    } catch {
      toast.error("Failed to update stage");
    }
  }

  async function handleLossConfirm(reason: LossReason, notes: string) {
    if (!pendingStage) return;
    setLossDialog(null);
    await commitStageChange(pendingStage.id, "closed_lost", { lossReason: reason, lossNotes: notes });
    setPendingStage(null);
  }

  function handleLossCancel() {
    setLossDialog(null);
    setPendingStage(null);
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 h-full">
          {stages.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              opps={byStage[stage] ?? []}
              activeId={activeId}
              accountNames={accountNames}
              repNames={repNames}
            />
          ))}
        </div>
        <DragOverlay>
          {activeOpp ? (
            <div className="rotate-2 scale-105 opacity-90">
              <DealCard opp={activeOpp} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <WinLossDialog open={!!lossDialog} onConfirm={handleLossConfirm} onCancel={handleLossCancel} />
      <CreateProjectDialog opportunity={wonOpp} open={!!wonOpp} onClose={() => setWonOpp(null)} />
    </>
  );
}
