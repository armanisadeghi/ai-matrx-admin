"use client";

/** The small Google ⇄ Microsoft 365 switch on each home (and the ribbon's tab row): writes the setting. */

import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { OFFICE_LOOK_OPTIONS } from "./office-look";
import { useOfficeLook } from "./useOfficeLook";

export function OfficeLookSwitch({ className }: { className?: string }) {
  const [look, setLook] = useOfficeLook();
  return (
    <SegmentedControl
      aria-label="Look"
      value={look}
      onValueChange={setLook}
      data={OFFICE_LOOK_OPTIONS}
      className={className}
    />
  );
}
