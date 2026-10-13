"use client";

/**
 * The small Google ⇄ Microsoft 365 switch on each home (and the ribbon's tab row): writes the
 * setting. Each side carries a mark: Google's own G, and a plain four-square glyph for Microsoft 365
 * (a generic glyph, never Microsoft's logo).
 */

import { LayoutGrid } from "lucide-react";
import { SegmentedControl, type SegmentOption } from "@ai-matrx/design-system/controls";
import { GoogleG } from "@/components/icons/google-brand";
import { OFFICE_LOOK_OPTIONS, type OfficeLook } from "./office-look";
import { useOfficeLook } from "./useOfficeLook";

const MARKS: Record<OfficeLook, React.ReactNode> = {
  google: <GoogleG className="size-3.5 shrink-0" />,
  microsoft: <LayoutGrid className="size-3.5 shrink-0" aria-hidden />,
};

const MARKED_OPTIONS: readonly SegmentOption<OfficeLook>[] = OFFICE_LOOK_OPTIONS.map((o) => ({
  value: o.value,
  ariaLabel: o.label,
  label: (
    <span className="flex items-center gap-1.5">
      {MARKS[o.value]}
      {o.label}
    </span>
  ),
}));

export function OfficeLookSwitch({ className }: { className?: string }) {
  const [look, setLook] = useOfficeLook();
  return (
    <SegmentedControl aria-label="Look" value={look} onValueChange={setLook} data={MARKED_OPTIONS} className={className} />
  );
}
