"use client";

/**
 * Every value in the Builder panel is shown through THE canonical JSON component
 * (`JsonInspector`: formatted / path explorer / tree / truncator, icon-only Copy and Copy for AI),
 * exactly as stored. Nothing here reshapes data.
 */

import { JsonInspector } from "@/components/official-candidate/json-inspector/JsonInspector";

export function BuilderJson({
  data,
  label,
  location,
  className,
}: {
  data: unknown;
  label?: string;
  /** Where the value lives (for the Copy for AI envelope). */
  location: string;
  className?: string;
}) {
  return (
    <JsonInspector
      showSource
      data={data === undefined ? null : data}
      label={label}
      className={className ?? "h-full min-h-48"}
      agentCopy={() => ({
        kind: "builder-value",
        location: `AI Matrx — Builder panel · ${location}`,
        description: label ?? "Builder panel value",
        data: (data === undefined ? null : data) as never,
      })}
    />
  );
}
