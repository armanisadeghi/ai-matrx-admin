"use client";

/**
 * The advanced reader's spend stop (owner ruling 2026-10-22): the button carries NO price. The price
 * sits behind a quiet Cost link, and the click asks first only when the most the read can cost is
 * above the organization's knob `advanced_read.confirm_over_points` (0 asks every time). A knob that
 * cannot be read asks, never silently spends.
 */

import { useEffect, useState } from "react";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { CostDoor } from "@/components/cost/CostDoor";
import { knobInt } from "@/lib/knobs/featureKnobs";

/** The organization's ask-above figure in points; 0 (ask every time) until it is read or when it cannot be. */
export function useConfirmOverPoints(): number {
  const [over, setOver] = useState(0);
  useEffect(() => {
    let live = true;
    knobInt("advanced_read", "confirm_over_points")
      .then((n) => live && setOver(n))
      .catch(() => live && setOver(0));
    return () => {
      live = false;
    };
  }, []);
  return over;
}

/** True when the read may go ahead: under the knob it just goes; above it the person confirms (cost behind the door). */
export async function confirmAdvancedRead(pointsUpTo: number | null | undefined, over: number, what: string): Promise<boolean> {
  if (pointsUpTo == null || !Number.isFinite(pointsUpTo) || pointsUpTo <= over) return true;
  return confirm({
    title: what,
    description: (
      <>
        This reader is slower and can cost more than usual. <CostDoor points={pointsUpTo} prefix="Up to " />
      </>
    ),
    confirmLabel: "Read",
  });
}
