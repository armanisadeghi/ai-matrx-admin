"use client";

/**
 * Per-member admin controls: tier/level, storage cap, monthly budget. The member note is edited on
 * the member page's Notes tab (its one home); a save here passes it back unchanged.
 * Advisory in v1 — values are stored, tracked, and surfaced; hard enforcement into the
 * upload/usage paths is a deliberate follow-up (see features/organizations/admin/FEATURE.md).
 * Not stated in the UI: controls are tracked and shown, not yet enforced.
 */
import React, { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { Label } from "@/components/ui/label";
import { setMemberControls } from "../service";
import type { OrgAdminMember } from "../types";
import { bytesToGb, gbToBytes, MCENTS_PER_USD, usdToMcents } from "../utils";
import { pointsToUsd, usdToPoints } from "@ai-matrx/kit/format";
import { usePointsRate } from "@/components/cost/pointsRate.client";

interface Props {
  orgId: string;
  member: OrgAdminMember;
  onSaved: () => void;
}

export function MemberControlsForm({ orgId, member, onSaved }: Props) {
  const [memberLevel, setMemberLevel] = useState(member.memberLevel ?? "");
  const [tierOverride, setTierOverride] = useState(member.tierOverride ?? "");
  const [storageCapGb, setStorageCapGb] = useState(bytesToGb(member.storageCapBytes));
  // Shown and typed in POINTS (20,000 = $1) like every cost; stored as
  // millicents (100,000 = $1) exactly as before.
  // `budgetDraft` is null until the person types: the shown value is derived
  // from the SUBSCRIBED rate, so a rate that lands late fills the field in
  // instead of freezing it empty (and saving that emptiness as "no cap").
  const rate = usePointsRate();
  const [budgetDraft, setBudgetPoints] = useState<string | null>(null);
  const budgetPoints =
    budgetDraft ??
    (member.monthlyBudgetMcents == null
      ? ""
      : String(usdToPoints(member.monthlyBudgetMcents / MCENTS_PER_USD, { rate }) ?? ""));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setMemberControls(orgId, member.userId, {
        memberLevel: memberLevel.trim() || null,
        tierOverride: tierOverride.trim() || null,
        storageCapBytes: gbToBytes(storageCapGb),
        monthlyBudgetMcents: usdToMcents(
          budgetPoints.trim() === ""
            ? ""
            : String(pointsToUsd(Number(budgetPoints), { rate }) ?? ""),
        ),
        notes: member.notes,
      });
      toast.success("Controls saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save controls");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="member-level">Member level / tier</Label>
          <Input
            id="member-level"
            value={memberLevel}
            onChange={(e) => setMemberLevel(e.target.value)}
            placeholder="e.g. premium, enterprise"
          />
          <p className="text-xs text-muted-foreground">Org-defined access label for this user.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tier-override">Storage tier override</Label>
          <Input
            id="tier-override"
            value={tierOverride}
            onChange={(e) => setTierOverride(e.target.value)}
            placeholder="Tier (optional)"
          />
          <p className="text-xs text-muted-foreground">Overrides the user&apos;s default storage tier.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="storage-cap">Storage capacity (GB)</Label>
          <Input
            id="storage-cap"
            type="number"
            min={0}
            step="0.5"
            value={storageCapGb}
            onChange={(e) => setStorageCapGb(e.target.value)}
            placeholder="Unlimited"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="budget">Monthly budget (points)</Label>
          <Input
            id="budget"
            type="number"
            min={0}
            step="1000"
            value={budgetPoints}
            onChange={(e) => setBudgetPoints(e.target.value)}
            placeholder="No limit"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button icon={saving ? <Loader2 className="animate-spin" /> : <Save />} variant="primary" onClick={save} disabled={saving}>
          Save controls
        </Button>
      </div>
    </div>
  );
}
