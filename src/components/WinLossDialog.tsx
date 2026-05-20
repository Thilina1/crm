"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LossReason } from "@/types";

const REASONS: { value: LossReason; label: string }[] = [
  { value: "price_too_high", label: "Price too high" },
  { value: "chose_competitor", label: "Chose a competitor" },
  { value: "went_silent", label: "Customer went silent / unresponsive" },
  { value: "requirements_changed", label: "Requirements changed" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onConfirm: (reason: LossReason, notes: string) => void;
  onCancel: () => void;
}

export function WinLossDialog({ open, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState<LossReason | "">("");
  const [notes, setNotes] = useState("");

  function handleConfirm() {
    if (!reason) return;
    onConfirm(reason as LossReason, notes);
    setReason("");
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Why was this deal lost?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {REASONS.map((r) => (
            <label
              key={r.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                reason === r.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="lossReason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-blue-600"
              />
              <span className="text-sm text-slate-700">{r.label}</span>
            </label>
          ))}

          {reason === "other" && (
            <Textarea
              placeholder="Describe the reason…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none border-slate-200"
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="border-slate-200">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Mark as Lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
