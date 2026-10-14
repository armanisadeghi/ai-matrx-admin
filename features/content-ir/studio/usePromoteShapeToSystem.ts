"use client";

import { useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAdminFeature } from "@/lib/redux/selectors/userSelectors";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import {
  promoteShapesToSystem,
  promotionSummary,
  type ShapePromotionResult,
} from "./promote-to-system";

/** The consequence, named before the click (destructive/expensive click law). */
export const PROMOTE_CONSEQUENCE =
  "Every user gets it. Renderers, samples, teaching blocks and nested shapes move with it; saved instances stay with their owners.";

/**
 * Single-shape promotion with its confirm and toasts. `canPromote` is the
 * screen gate only — the database door re-checks super admin.
 */
export function usePromoteShapeToSystem() {
  const canPromote = useAppSelector((s) =>
    selectAdminFeature(s, "shape.promote-to-system"),
  );
  const [promoting, setPromoting] = useState(false);

  async function promote(shape: {
    id: string;
    label: string;
  }): Promise<ShapePromotionResult | null> {
    const ok = await confirm({
      title: `Promote "${shape.label}" to Matrx System?`,
      description: PROMOTE_CONSEQUENCE,
      confirmLabel: "Promote to system",
    });
    if (!ok) return null;
    setPromoting(true);
    try {
      const result = await promoteShapesToSystem([shape.id]);
      toast.success(promotionSummary(result));
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setPromoting(false);
    }
  }

  return { canPromote, promoting, promote };
}
