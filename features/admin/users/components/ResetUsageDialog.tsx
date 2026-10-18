"use client";

// Reset a person's AI-points usage windows (billing.usage_reset_apply, super-admin): one marker per
// window; the calculation then counts that window from the marker. Shared by Users & Access ›
// AI usage limits and a person's Billing & usage tab.

import { useState } from "react";
import { Input } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { applyUsageReset } from "@/features/admin/limits/service";
import { periodLabel } from "@/features/admin/limits/types";
import { resetConsequence } from "@/features/admin/limits/enterpriseCustom";

const RESET_CHOICES = ["rolling_5h", "week", "month"] as const;

export interface ResetUsagePerson {
  id: string;
  label: string;
}

export function ResetUsageDialog({
  person,
  onClose,
  onDone,
}: {
  /** Who is reset; null = closed. */
  person: ResetUsagePerson | null;
  onClose: () => void;
  /** The person's fresh billing.user_usage_state, verbatim. */
  onDone: (personId: string, fresh: unknown) => void;
}) {
  const row = person;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [all, setAll] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (row && seededFor !== row.id) {
    setSeededFor(row.id);
    setPicked(new Set());
    setAll(false);
    setNote("");
  }
  const periods = all ? null : RESET_CHOICES.filter((p) => picked.has(p));
  const ready = all || (periods?.length ?? 0) > 0;
  const name = row?.label ?? "";

  const toggle = (period: string, on: boolean) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(period);
      else next.delete(period);
      return next;
    });
  };

  const submit = async () => {
    if (!row || !ready) return;
    setSaving(true);
    try {
      const fresh = await applyUsageReset(row.id, periods, note.trim() || null);
      onDone(row.id, fresh);
      toast.success("Usage reset");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset AI usage</DialogTitle>
          <DialogDescription className="truncate">{name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {RESET_CHOICES.map((period) => (
              <label key={period} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={all || picked.has(period)}
                  disabled={all}
                  onCheckedChange={(v) => toggle(period, v === true)}
                  aria-label={periodLabel(period)}
                />
                {periodLabel(period)}
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-sm">
              <Checkbox checked={all} onCheckedChange={(v) => setAll(v === true)} aria-label="All windows" />
              All
            </label>
          </div>
          <label className="block space-y-1 text-xs text-muted-foreground">
            <span>Note (optional)</span>
            <Input value={note} placeholder="Support: stuck after a failed run" onChange={(e) => setNote(e.target.value)} />
          </label>
          <p className={cn("type-body", ready ? "text-foreground" : "text-muted-foreground")}>
            {ready ? resetConsequence(name, periods) : "Pick the windows to clear."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={saving && <Spinner size="xs" className="text-current" />} variant="danger" onClick={() => void submit()} disabled={saving || !ready}>
            Reset usage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
