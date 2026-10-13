"use client";

/** The selected entry: what it is, where it came from, when — and the value exactly as published,
 *  in the canonical JSON component. A derived entry names the raw source it came from. */

import { useState } from "react";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { BUILDER_GROUP_LABELS, type BuilderEntry } from "../types";
import { BuilderJson } from "./BuilderJson";

export function BuilderEntryDetail({
  entry,
  onOpenSource,
}: {
  entry: BuilderEntry;
  /** Open the step a derived value came from (its raw output and requests). */
  onOpenSource: (nodeId: string) => void;
}) {
  // Which value: the current one, or one of the earlier ones this key held.
  const [version, setVersion] = useState<number>(-1);
  const shown = version < 0 ? entry.data : entry.history[version]?.data;
  const shownAt = version < 0 ? entry.at : entry.history[version]?.at ?? entry.at;
  const certainty = typeof entry.certainty === "number" ? Math.round(entry.certainty * 100) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-3 py-1.5">
        <h2 className="min-w-0 truncate text-sm font-semibold">{entry.label}</h2>
        <Badge>{BUILDER_GROUP_LABELS[entry.group] ?? entry.group}</Badge>
        {entry.kind ? <Badge tone="info">{entry.kind}</Badge> : null}
        {certainty !== null ? <Badge tone={certainty >= 70 ? "success" : "warning"}>{certainty}% sure</Badge> : null}
        <span className="text-[11px] text-muted-foreground" title={new Date(shownAt).toLocaleString()}>
          {formatRelativeTime(shownAt)}
        </span>
        {entry.source ? <span className="truncate text-[11px] text-muted-foreground">{entry.source}</span> : null}
        {entry.history.length ? (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
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
        {entry.fromNodes?.length ? (
          <span className="ml-auto flex items-center gap-1">
            {entry.fromNodes.map((n) => (
              <Button key={n} variant="quiet" onClick={() => onOpenSource(n)} title={`Open the raw output of step ${n}`}>
                From {n}
              </Button>
            ))}
          </span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-2">
        <BuilderJson data={shown} label={entry.key} location={`Data · ${entry.label}`} className="h-full" />
      </div>
    </div>
  );
}
