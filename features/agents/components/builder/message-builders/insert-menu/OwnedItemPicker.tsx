"use client";

/**
 * A cascade panel for things the Insert menu fetches (kinds, prompt blocks):
 * search, the canonical Mine | Shared | All | Public lanes, then one-line rows
 * that open the platform's ONE Peek on hover — the agent picker's pattern.
 */

import { useMemo, useState, type ReactNode } from "react";
import { Peek, PeekHoverCard, type PeekRecord } from "@ai-matrx/design-system";
import { SearchField, Tabs } from "@ai-matrx/design-system/controls";

export type OwnerLane = "mine" | "shared" | "all" | "public";

const LANES: readonly { value: OwnerLane; label: string }[] = [
  { value: "mine", label: "Mine" },
  { value: "shared", label: "Shared" },
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
];

/** The Matrx System organization: platform-wide (Public) records live here. */
export const SYSTEM_ORG_ID = "39c38960-d30c-4840-b0c1-c9960de95582";

export interface Ownership {
  organizationId: string | null;
  createdBy: string | null;
}

/** Which lane a record sits in for this person ("all" holds every lane). */
export function ownerLaneOf(owner: Ownership, meId: string | null): Exclude<OwnerLane, "all"> {
  if (owner.organizationId === SYSTEM_ORG_ID) return "public";
  if (meId !== null && owner.createdBy === meId) return "mine";
  return "shared";
}

export interface OwnedPickerItem {
  id: string;
  /** The row's one line. */
  label: string;
  /** A quieter value on the right (a slug, a name). */
  detail?: string;
  lane: Exclude<OwnerLane, "all">;
  /** Words the search also matches. */
  search: string;
  peek: () => PeekRecord;
}

interface OwnedItemPickerProps {
  /** null while loading. */
  items: readonly OwnedPickerItem[] | null;
  error?: string | null;
  searchLabel: string;
  onPick: (item: OwnedPickerItem) => void;
  footer?: ReactNode;
}

export function OwnedItemPicker({ items, error, searchLabel, onPick, footer }: OwnedItemPickerProps) {
  const [query, setQuery] = useState("");
  const [lane, setLane] = useState<OwnerLane>("all");

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((item) => !q || item.search.toLowerCase().includes(q));
  }, [items, query]);
  const counts = useMemo(() => {
    const out: Record<OwnerLane, number> = { mine: 0, shared: 0, all: matching.length, public: 0 };
    for (const item of matching) out[item.lane] += 1;
    return out;
  }, [matching]);
  const shown = lane === "all" ? matching : matching.filter((item) => item.lane === lane);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <SearchField
        aria-label={searchLabel}
        placeholder={searchLabel}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && shown[0]) {
            e.preventDefault();
            onPick(shown[0]);
          }
        }}
      />
      <Tabs
        variant="capsule"
        aria-label="Owner"
        value={lane}
        onValueChange={(value) => setLane(value as OwnerLane)}
        data={LANES.map((l) => ({ value: l.value, label: l.label, count: counts[l.value] }))}
      />
      <div className="min-h-0 flex-1 overflow-y-auto" role="listbox" aria-label={searchLabel}>
        {error ? (
          <p className="px-2.5 py-2 text-xs text-destructive">{error}</p>
        ) : items === null ? (
          <p className="px-2.5 py-2 text-xs text-muted-foreground">Loading</p>
        ) : shown.length === 0 ? (
          <p className="px-2.5 py-2 text-xs text-muted-foreground">Nothing here</p>
        ) : (
          shown.map((item) => (
            <PeekHoverCard
              key={item.id}
              side="right"
              trigger={
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => onPick(item)}
                  className="flex h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent"
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.detail && item.detail !== item.label ? (
                    <span className="max-w-[45%] shrink-0 truncate font-mono text-xs text-muted-foreground">{item.detail}</span>
                  ) : null}
                </button>
              }
            >
              <Peek record={item.peek()} />
            </PeekHoverCard>
          ))
        )}
      </div>
      {footer}
    </div>
  );
}
