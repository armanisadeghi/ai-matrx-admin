"use client";

/**
 * Prompt blocks library: lanes Mine | Organization | System, search, one row per block.
 * The lane (`?lane=`) and the search (`?q=`) live in the URL, so a link or a reload
 * opens the same view (walk-core 2026-10-18).
 *
 * THE SHARED TABLE (live walk 2026-10-22): the rows are a MatrxDataTable — the Mac table every
 * list wears, its own checkboxes and selection bar — never a hand-drawn list with its own bar.
 */
import { useEffect, useMemo, useState } from "react";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { commitUrlParams } from "@ai-matrx/kit/url-state";
import { useListSearchParams } from "@/lib/entity-list/useListSearchParams";
import { ENTITY_LIST_URL_PARAMS } from "@/lib/entity-list/urlQuery";
import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { Badge, Button, EmptyState, SearchField, Tabs } from "@ai-matrx/design-system/controls";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { invalidateBlocks, loadBlocks } from "../blocksCache";
import {
  BLOCK_LANE_LABEL,
  BLOCK_LANE_PARAM,
  BLOCK_LANES,
  blockLaneFromParam,
  matchesQuery,
  partitionByLane,
  type BlockLane,
} from "../lanes";
import type { PromptBlockRow } from "../types";

export function PromptBlockLibrary() {
  const meId = useAppSelector(selectUserId);
  const [rows, setRows] = useState<PromptBlockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const params = useListSearchParams();
  const query = params.get(ENTITY_LIST_URL_PARAMS.search) ?? "";
  const lane = blockLaneFromParam(params.get(BLOCK_LANE_PARAM));
  const setQuery = (next: string) =>
    commitUrlParams({ [ENTITY_LIST_URL_PARAMS.search]: next || null }, "replace");
  const setLane = (next: BlockLane) => commitUrlParams({ [BLOCK_LANE_PARAM]: next }, "push");

  useEffect(() => {
    loadBlocks()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load blocks"));
  }, []);

  const lanes = useMemo(() => partitionByLane(rows ?? [], meId), [rows, meId]);
  const shown = lanes[lane].filter((r) => matchesQuery(r, query));
  const reload = () => {
    invalidateBlocks();
    loadBlocks()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load blocks"));
  };
  // The table's own selection and bulk bar. Ticks on rows a lane change or a search hides drop
  // out. Built-ins only: a block the person can't archive (a System block) is skipped and named by
  // the run; no Share… (a prompt block is not a shareable resource type), no favorites.
  const bulk = useTableBulkSelection<PromptBlockRow>({
    token: "agent_prompt_block",
    noun: "block",
    rows: shown,
    getRowId: (r) => r.id,
    getRowName: (r) => r.name,
    standardBulkActions: { share: false },
    favoritesShown: false,
    onRefresh: reload,
  });

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
        <div className="flex min-h-0 flex-1 flex-col" data-testid={`prompt-block-lane-${lane}`}>
          <MatrxDataTable<PromptBlockRow>
            key={lane}
            tableId="agents/prompt-blocks"
            data={rows ? shown : []}
            columns={BLOCK_COLUMNS}
            getRowId={(row) => row.id}
            getRowHref={(row) => `/agents/prompt-blocks/${row.id}`}
            selection={bulk.selection}
            detail={{ enabled: false }}
            pageSize={0}
            frameHeight="fill"
            fitToWidth="grow"
            // The lanes' search above is the page's one search box (it lives in the address).
            toolbar={{ search: false }}
            read={{ status: error ? "error" : rows ? "ready" : "loading", error: error ?? undefined, onRetry: reload, what: "blocks" }}
            emptyState={{
              icon: <Boxes />,
              title: query ? "No match" : `No ${BLOCK_LANE_LABEL[lane].toLowerCase()} blocks yet`,
              action: (
                <Button asChild variant="primary">
                  <Link href="/agents/prompt-blocks/new">New block</Link>
                </Button>
              ),
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** A block's columns: its name, what it says it does, and what it is (Skill, bound tool). */
const BLOCK_COLUMNS: MatrxColumnDef<PromptBlockRow>[] = [
  {
    id: "name",
    header: "Block",
    width: 260,
    accessorFn: (row) => row.name,
    // The name is the block's real link (open in a new tab, copy the link), as the list's rows were.
    cell: (row) => (
      <Link href={`/agents/prompt-blocks/${row.id}`} className="font-mono text-foreground hover:underline">
        {row.name}
      </Link>
    ),
  },
  {
    id: "description",
    header: "Description",
    width: 420,
    accessorFn: (row) => row.description || row.label || "",
  },
  {
    id: "kind",
    header: "Kind",
    width: 180,
    accessorFn: (row) => [row.source_kind === "skill" ? "Skill" : "", row.bound_tool ?? ""].filter(Boolean).join(" "),
    cell: (row) =>
      row.source_kind === "skill" || row.bound_tool ? (
        <span className="inline-flex items-center gap-1">
          {row.source_kind === "skill" && <Badge tone="info">Skill</Badge>}
          {row.bound_tool && <Badge>{row.bound_tool}</Badge>}
        </span>
      ) : null,
  },
];
