"use client";

/** The selected entry: what it is, where it came from, when — and the value, smart or raw. */

import { useState } from "react";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { Badge, SegmentedControl } from "@ai-matrx/design-system/controls";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { BUILDER_GROUP_LABELS, type BuilderEntry } from "../types";
import { BuilderValue } from "./BuilderValue";

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}

export function BuilderEntryDetail({
  entry,
  surfaceKey,
  raw,
  onRaw,
}: {
  entry: BuilderEntry;
  surfaceKey: string;
  raw: boolean;
  onRaw: (raw: boolean) => void;
}) {
  // Which value: the current one, or one of the earlier ones this key held.
  const [version, setVersion] = useState<number>(-1);
  const shown = version < 0 ? entry.data : entry.history[version]?.data;
  const shownAt = version < 0 ? entry.at : entry.history[version]?.at ?? entry.at;
  const certainty = typeof entry.certainty === "number" ? Math.round(entry.certainty * 100) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <h2 className="min-w-0 truncate text-sm font-semibold">{entry.label}</h2>
        <Badge>{BUILDER_GROUP_LABELS[entry.group]}</Badge>
        {entry.kind ? <Badge tone="info">{entry.kind}</Badge> : null}
        {certainty !== null ? <Badge tone={certainty >= 70 ? "success" : "warning"}>{certainty}% sure</Badge> : null}
        <div className="ml-auto flex items-center gap-2">
          <SegmentedControl
            aria-label="View"
            value={raw ? "raw" : "smart"}
            onValueChange={(v) => onRaw(v === "raw")}
            data={[
              { value: "smart", label: "View" },
              { value: "raw", label: "Raw" },
            ]}
          />
          <CopyButtons
            label={entry.label}
            sourceId={`${surfaceKey}:${entry.key}`}
            json={() => shown}
            human={() => toText(shown)}
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1 text-[11px] text-muted-foreground">
        <span title={new Date(shownAt).toLocaleString()}>{formatRelativeTime(shownAt)}</span>
        {entry.source ? <span className="truncate">{entry.source}</span> : null}
        <span className="truncate font-mono">{entry.key}</span>
        {entry.history.length ? (
          <span className="flex items-center gap-1">
            <button
              type="button"
              data-clickable
              className={version < 0 ? "font-semibold text-foreground" : "hover:underline"}
              onClick={() => setVersion(-1)}
            >
              Now
            </button>
            {entry.history.map((h, i) => (
              <button
                key={h.at}
                type="button"
                data-clickable
                className={version === i ? "font-semibold text-foreground" : "hover:underline"}
                onClick={() => setVersion(i)}
                title={new Date(h.at).toLocaleString()}
              >
                −{i + 1}
              </button>
            ))}
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pt-1">
        <BuilderValue value={shown} kind={entry.kind} raw={raw} />
      </div>
    </div>
  );
}
