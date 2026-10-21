"use client";

import { formatCount } from "@ai-matrx/kit/format";
import { Loader2, Radar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { shouldWarnAboutCost } from "@/components/cost/costTier";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";

import { useBrandCheckEstimate, useRunBrandCheck } from "./hooks";

/** The manual Run check. A costly one asks first; there is no schedule behind it. */
export function RunCheckButton({
  brandId,
  organizationId,
  disabled,
}: {
  brandId: string;
  organizationId: string;
  disabled?: boolean;
}) {
  const estimate = useBrandCheckEstimate(brandId, organizationId);
  const run = useRunBrandCheck(brandId, organizationId);
  const { toPoints } = useCostDisplay();
  const usd = estimate.data?.estimate_usd ?? null;
  const blocked =
    disabled || estimate.isPending || !estimate.data?.can_compare || run.isPending;

  const onRun = async () => {
    if (usd == null) return;
    const points = toPoints(usd);
    if (points != null && shouldWarnAboutCost(points)) {
      const ok = await confirm({
        title: "Run this check?",
        description: `It uses about ${formatCount(points)} points.`,
        confirmLabel: "Run check",
      });
      if (!ok) return;
    }
    try {
      await run.mutateAsync(usd);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  return (
    <Button variant="outline" onClick={onRun} disabled={blocked}>
      {run.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
      {run.isPending ? "Checking" : "Run check"}
    </Button>
  );
}
