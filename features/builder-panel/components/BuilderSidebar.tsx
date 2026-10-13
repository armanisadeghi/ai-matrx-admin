"use client";

/** Builder panel Values list — every entry of the surface, grouped; new ones flash in. Group
 *  headers carry an icon and a rule above them, the way a macOS source list separates sections. */

import { Calculator, Keyboard, MoreHorizontal, Package, ScrollText, Workflow, type LucideIcon } from "lucide-react";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { BUILDER_GROUPS, BUILDER_GROUP_LABELS, type BuilderEntry, type BuilderGroup } from "../types";
import styles from "./builder.module.css";

const GROUP_ICONS: Record<BuilderGroup, LucideIcon> = {
  inputs: Keyboard,
  workflow: Workflow,
  ai: AGENT_ICON,
  provision: Package,
  mandates: ScrollText,
  derived: Calculator,
  other: MoreHorizontal,
};

/** An entry published within this window still reads as new. */
const FRESH_MS = 2_500;

/** Entries from a group this build no longer has (an older persisted feed) sit under Other. */
function groupOf(entry: BuilderEntry): BuilderGroup {
  return (BUILDER_GROUPS as readonly string[]).includes(entry.group) ? entry.group : "other";
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto py-1">
      {BUILDER_GROUPS.map((group) => {
        const list = entries.filter((e) => groupOf(e) === group);
        if (!list.length) return null;
        const Icon = GROUP_ICONS[group];
        return (
          <section key={group} className="border-t border-border pb-1 first:border-t-0">
            <h3 className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-xs font-semibold text-foreground/80">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{BUILDER_GROUP_LABELS[group]}</span>
              <span className="text-[11px] font-normal tabular-nums text-muted-foreground">{list.length}</span>
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
                  <span className="w-full truncate text-[11px] text-muted-foreground">
                    {[entry.at ? formatRelativeTime(entry.at) : null, entry.source].filter(Boolean).join(" · ")}
                  </span>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
