"use client";

/**
 * The prompt block picker: a small floating panel (not a modal) anchored where the person was
 * working. Search, then Mine | Organization | System. Choosing writes `{{<name>}}` (the caller also
 * declares it on the agent).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@ai-matrx/design-system";
import { Badge, SearchField, Tabs } from "@ai-matrx/design-system/controls";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import { loadBlocks, winningRowId } from "../blocksCache";
import { BLOCK_LANES, BLOCK_LANE_LABEL, SYSTEM_ORG_ID, matchesQuery, partitionByLane, type BlockLane } from "../lanes";
import type { PromptBlockRow } from "../types";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

export interface PickerAnchor {
  x: number;
  y: number;
}

interface PromptBlockPickerProps {
  open: boolean;
  anchor: PickerAnchor | null;
  initialQuery?: string;
  declared: ReadonlySet<string>;
  onPick: (row: PromptBlockRow) => void;
  onClose: () => void;
}

export function PromptBlockPicker({ open, anchor, initialQuery = "", declared, onPick, onClose }: PromptBlockPickerProps) {
  const meId = useAppSelector(selectUserId);
  const orgId = useAppSelector(selectActiveOrganizationId);
  const [rows, setRows] = useState<PromptBlockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [lane, setLane] = useState<BlockLane>("organization");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    let cancelled = false;
    loadBlocks()
      .then((r) => !cancelled && (setRows(r), setError(null)))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load blocks"));
    return () => {
      cancelled = true;
    };
  }, [open, initialQuery]);

  const lanes = useMemo(() => partitionByLane(rows ?? [], meId), [rows, meId]);
  // Open on the first lane that has a match, so a typed query never shows an empty lane first.
  useEffect(() => {
    if (!rows) return;
    const first = BLOCK_LANES.find((l) => lanes[l].some((r) => matchesQuery(r, query)));
    if (first && !lanes[lane].some((r) => matchesQuery(r, query))) setLane(first);
  }, [rows, query, lanes, lane]);

  const shown = lanes[lane].filter((r) => matchesQuery(r, query));
  // The row that runs for each name; a row is "Overridden" only when a different row of its name runs.
  const winnerByName = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const r of rows ?? []) if (!map.has(r.name)) map.set(r.name, winningRowId(rows ?? [], r.name, meId, SYSTEM_ORG_ID, orgId));
    return map;
  }, [rows, meId, orgId]);

  return (
    <Popover open={open} onOpenChange={(o) => !o && onClose()}>
      <PopoverAnchor asChild>
        <div style={{ position: "fixed", left: anchor?.x ?? 0, top: anchor?.y ?? 0, width: 1, height: 1, pointerEvents: "none" }} />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-80 p-2"
        data-testid="prompt-block-picker"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <SearchField
          ref={inputRef}
          aria-label="Search prompt blocks"
          placeholder="Search blocks"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && shown[0]) {
              e.preventDefault();
              onPick(shown[0]);
            }
            if (e.key === "Escape") onClose();
          }}
          className="mb-2"
        />
        <Tabs
          variant="capsule"
          aria-label="Block level"
          value={lane}
          onValueChange={(v) => setLane(v as BlockLane)}
          data={BLOCK_LANES.map((l) => ({ value: l, label: BLOCK_LANE_LABEL[l], count: lanes[l].filter((r) => matchesQuery(r, query)).length }))}
        />
        <div className="mt-2 max-h-64 overflow-y-auto" role="listbox" aria-label="Prompt blocks">
          {error && <p className="px-2 py-3 text-xs text-destructive">{error}</p>}
          {!error && !rows && <p className="px-2 py-3 text-xs text-muted-foreground">Loading</p>}
          {!error && rows && shown.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No blocks here</p>}
          {shown.map((row) => (
            <button
              key={row.id}
              type="button"
              role="option"
              aria-selected={false}
              data-testid={`prompt-block-option-${row.name}`}
              onClick={() => onPick(row)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:bg-accent"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs">{row.name}</span>
                {row.label && row.label !== row.name && <span className="block truncate text-[11px] text-muted-foreground">{row.label}</span>}
              </span>
              {declared.has(row.name) && <Check className="h-3.5 w-3.5 text-muted-foreground" aria-label="Declared" />}
              {winnerByName.get(row.name) && winnerByName.get(row.name) !== row.id && <Badge>Overridden</Badge>}
            </button>
          ))}
        </div>
        <OutboundLink
          href="/agents/prompt-blocks/new"
          className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-primary hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          New block
        </OutboundLink>
      </PopoverContent>
    </Popover>
  );
}
