"use client";

/**
 * Prompt blocks library: lanes Mine | Organization | System, search, one row per block.
 * The lane (`?lane=`) and the search (`?q=`) live in the URL, so a link or a reload
 * opens the same view (walk-core 2026-10-18).
 */
import { useEffect, useMemo, useState } from "react";
import { commitUrlParams } from "@ai-matrx/kit/url-state";
import { useListSearchParams } from "@/lib/entity-list/useListSearchParams";
import { ENTITY_LIST_URL_PARAMS } from "@/lib/entity-list/urlQuery";
import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { Badge, Button, EmptyState, SearchField, Tabs } from "@ai-matrx/design-system/controls";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { RecordList } from "@ai-matrx/design-system/record-list";
import { RowSelectionBar, useRowSelection } from "@/lib/entity-list/RowSelectionBar";
import { standardBulkActionsFor } from "@/lib/entity-list/standardBulkActions";
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
          <RecordList
            items={rows ? shown : []}
            getKey={(row) => row.id}
            title={(row) => row.name}
            subtitle={(row) => (row.label || row.description ? <span className="font-sans">{row.description || row.label}</span> : null)}
            trailing={(row) =>
              row.source_kind === "skill" || row.bound_tool ? (
                <>
                  {row.source_kind === "skill" && <Badge tone="info">Skill</Badge>}
                  {row.bound_tool && <Badge>{row.bound_tool}</Badge>}
                </>
              ) : null
            }
            href={(row) => `/agents/prompt-blocks/${row.id}`}
            selectedKeys={selection.rows.map((r) => r.id)}
            onSelectedKeysChange={(keys) => {
              const next = new Set(keys);
              for (const row of shown) if (next.has(row.id) !== selection.has(row.id)) selection.toggle(row.id);
            }}
            read={{ status: error ? "error" : rows ? "ready" : "loading", error: error ?? undefined, what: "blocks" }}
            emptyState={
              <EmptyState
                icon={<Boxes />}
                title={query ? "No match" : `No ${BLOCK_LANE_LABEL[lane].toLowerCase()} blocks yet`}
                action={
                  <Button asChild variant="primary">
                    <Link href="/agents/prompt-blocks/new">New block</Link>
                  </Button>
                }
              />
            }
            sourceFeature="agent_prompt_block"
            ariaLabel="Prompt blocks"
            className="font-mono"
          />
        </div>
      </div>
    </div>
  );
}
