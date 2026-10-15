"use client";

/** Prompt blocks library: lanes Mine | Organization | System, search, one row per block. */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { Badge, Button, EmptyState, SearchField, Tabs } from "@ai-matrx/design-system/controls";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { Checkbox } from "@/components/ui/checkbox";
import { RowSelectionBar, useRowSelection } from "@/lib/entity-list/RowSelectionBar";
import { standardBulkActionsFor } from "@/lib/entity-list/standardBulkActions";
import { invalidateBlocks, loadBlocks } from "../blocksCache";
import { BLOCK_LANES, BLOCK_LANE_LABEL, matchesQuery, partitionByLane, type BlockLane } from "../lanes";
import type { PromptBlockRow } from "../types";

export function PromptBlockLibrary() {
  const meId = useAppSelector(selectUserId);
  const [rows, setRows] = useState<PromptBlockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [lane, setLane] = useState<BlockLane>("organization");

  useEffect(() => {
    loadBlocks()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load blocks"));
  }, []);

  const lanes = useMemo(() => partitionByLane(rows ?? [], meId), [rows, meId]);
  const shown = lanes[lane].filter((r) => matchesQuery(r, query));
  // Ticks clear when the lane changes; rows a search hides drop out of the selection.
  const selection = useRowSelection(shown, (r) => r.id, lane);
  // Built-ins only: a block the person can't archive (a System block) is skipped and named by the run.
  const bulkActions = standardBulkActionsFor<PromptBlockRow>({
    token: "agent_prompt_block",
    noun: "block",
    rowIdOf: (r) => r.id,
    labelOf: (r) => r.name,
    // No Share…: a prompt block is not a shareable resource type (no share registry row).
    config: { share: false },
    favoritesShown: false,
  });
  const reload = () => {
    invalidateBlocks();
    loadBlocks()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load blocks"));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-textured">
      <RouteHeader
        left={<h1 className="type-title truncate text-foreground">Prompt blocks</h1>}
        right={
          <Button asChild variant="primary" icon={<Plus />}>
            <Link href="/agents/prompt-blocks/new" data-testid="prompt-block-new">
              New block
            </Link>
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-[calc(var(--shell-header-h)+0.75rem)]">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            variant="capsule"
            aria-label="Block level"
            value={lane}
            onValueChange={(v) => setLane(v as BlockLane)}
            data={BLOCK_LANES.map((l) => ({ value: l, label: BLOCK_LANE_LABEL[l], count: rows ? lanes[l].length : null }))}
          />
          <SearchField aria-label="Search blocks" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" data-testid={`prompt-block-lane-${lane}`}>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && !rows && <p className="text-sm text-muted-foreground">Loading</p>}
          {!error && rows && shown.length === 0 && (
            <EmptyState
              icon={<Boxes />}
              title={query ? "No match" : `No ${BLOCK_LANE_LABEL[lane].toLowerCase()} blocks yet`}
              action={
                <Button asChild variant="primary">
                  <Link href="/agents/prompt-blocks/new">New block</Link>
                </Button>
              }
            />
          )}
          {rows && shown.length > 0 && (
            <div className="mb-1.5">
              <RowSelectionBar
                selection={selection}
                idOf={(r) => r.id}
                actions={bulkActions}
                noun="block"
                plural="blocks"
                onRefresh={reload}
                onRemoveRows={selection.clear}
              />
            </div>
          )}
          <ul className="flex flex-col gap-1.5">
            {shown.map((row) => (
              <li key={row.id} className="flex items-center gap-2 rounded-lg border border-border bg-card pl-3 hover:bg-accent">
                <Checkbox
                  checked={selection.has(row.id)}
                  onCheckedChange={() => selection.toggle(row.id)}
                  aria-label={`Select ${row.name}`}
                  className="shrink-0"
                />
                <Link
                  href={`/agents/prompt-blocks/${row.id}`}
                  data-testid={`prompt-block-row-${row.name}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-2 pr-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm">{row.name}</span>
                    {(row.label || row.description) && (
                      <span className="block truncate text-xs text-muted-foreground">{row.description || row.label}</span>
                    )}
                  </span>
                  {row.source_kind === "skill" && <Badge tone="info">Skill</Badge>}
                  {row.bound_tool && <Badge>{row.bound_tool}</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
