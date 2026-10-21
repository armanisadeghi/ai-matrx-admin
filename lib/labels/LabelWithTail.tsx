// lib/labels/LabelWithTail.tsx
//
// A one-line label that truncates its TEXT and never its TAIL — the part that tells two
// same-named records apart (`labelTails`, `homeLabelParts`). Truncating the whole string cut
// the tail off, so two different organizations still showed identical rows.

import React from "react";
import { cn } from "@/lib/utils";

export function LabelWithTail({
  text,
  tail,
  className,
}: {
  text: string;
  tail?: string | null;
  className?: string;
}) {
  if (!tail) return <span className={cn("min-w-0 truncate", className)}>{text}</span>;
  return (
    <span className={cn("flex min-w-0 items-baseline", className)} title={text + tail}>
      <span className="min-w-0 truncate">{text}</span>
      <span className="shrink-0 whitespace-pre" data-label-tail="">
        {tail}
      </span>
    </span>
  );
}
