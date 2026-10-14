"use client";

/**
 * HiddenFilter — the one-click way into a list's "Hidden by me" view (platform
 * primitive, 2026-10-14; sits beside `ArchiveFilter`). Absent until the person
 * has hidden something in this list, so it adds nothing to a clean list.
 */

import { EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HiddenView } from "@/features/access-gate/service/hiddenByMe";

export function HiddenFilter({
  count,
  value,
  onValueChange,
}: {
  /** How many items of this list the person has hidden. */
  count: number;
  value: HiddenView;
  onValueChange: (value: HiddenView) => void;
}) {
  if (count === 0 && value === "visible") return null;
  const showing = value === "hidden";
  return (
    <Button
      type="button"
      variant={showing ? "outline" : "quiet"}
      icon={<EyeOff />}
      aria-pressed={showing}
      title={showing ? "Back to the list" : "Items you hid"}
      onClick={() => onValueChange(showing ? "visible" : "hidden")}
    >
      {`Hidden ${count}`}
    </Button>
  );
}
