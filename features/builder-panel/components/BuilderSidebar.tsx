"use client";

/** Builder panel sidebar — every entry of the surface, grouped; new ones flash in. */

import { cn } from "@/lib/utils";
import { BUILDER_GROUPS, BUILDER_GROUP_LABELS, type BuilderEntry } from "../types";
import styles from "./builder.module.css";

/** An entry published within this window still reads as new. */
const FRESH_MS = 2_500;

function preview(entry: BuilderEntry): string {
  const d = entry.data;
  if (d === null || d === undefined) return "empty";
  if (typeof d === "string") return d;
  if (typeof d === "number" || typeof d === "boolean") return String(d);
  if (Array.isArray(d)) return `${d.length} item${d.length === 1 ? "" : "s"}`;
  return `${Object.keys(d as object).length} fields`;
}

export function BuilderSidebar({
  entries,
  selectedKey,
  onSelect,
  now,
}: {
  entries: BuilderEntry[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  now: number;
}) {
  if (!entries.length) {
    return <div className="px-3 py-3 text-xs text-muted-foreground">Nothing published on this page yet</div>;
  }
  return (
    <div className="flex h-full min-h-0 flex-col py-1">
      {BUILDER_GROUPS.map((group) => {
        const list = entries.filter((e) => e.group === group);
        if (!list.length) return null;
        return (
          <section key={group} className="pb-1">
            <h3 className="flex items-center justify-between px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{BUILDER_GROUP_LABELS[group]}</span>
              <span className="tabular-nums">{list.length}</span>
            </h3>
            {list.map((entry) => {
              const fresh = now - entry.at < FRESH_MS;
              const certainty = typeof entry.certainty === "number" ? Math.round(entry.certainty * 100) : null;
              return (
                <button
                  key={`${entry.key}:${entry.at}`}
                  type="button"
                  data-clickable
                  onClick={() => onSelect(entry.key)}
                  aria-current={selectedKey === entry.key ? "true" : undefined}
                  className={cn(
                    "flex w-full min-w-0 flex-col items-start gap-0 px-3 py-1 text-left hover:bg-accent/60",
                    selectedKey === entry.key && "bg-accent",
                    fresh && styles.fresh,
                  )}
                >
                  <span className="flex w-full min-w-0 items-center gap-1.5">
                    <span className="truncate text-xs font-medium">{entry.label}</span>
                    {certainty !== null ? (
                      <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">{certainty}%</span>
                    ) : null}
                  </span>
                  <span className="w-full truncate text-[11px] text-muted-foreground">{preview(entry)}</span>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
