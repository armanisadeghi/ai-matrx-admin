import { z } from "zod";
import { collectProblems, refuseRepeats, readCollectionList } from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import { nextQueryState } from "@ai-matrx/design-system/data-table/query-control";
import type { MatrxDataTableQueryState } from "@ai-matrx/design-system/data-table/types";
import type { Assist } from "../types";

export const assistViewPatch = z.object({
  status_tab: z.enum(["pending", "accepted", "dismissed", "resolved", "all"]).optional(),
  urgency: z.enum(["normal", "elevated", "urgent"]).nullable().optional(),
  include_snoozed: z.boolean().optional(),
  starred_only: z.boolean().optional(),
  unseen_only: z.boolean().optional(),
  show_silenced: z.boolean().optional(),
  search: z.string().optional(),
  source_key: z.string().nullable().optional(),
  source_kind: z.enum(["deterministic", "agent", "sweep", "stream"]).nullable().optional(),
  surface_name: z.string().nullable().optional(),
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().optional(),
  sort: z.object({ id: z.enum(["created_at", "decided_at", "priority", "confidence", "status", "sourceKey", "first_seen_at", "occurrences"]), direction: z.enum(["asc", "desc"]) }).strict().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Name at least one view setting. Nothing was changed.");

export function nextAssistTableState(current: MatrxDataTableQueryState, patch: z.infer<typeof assistViewPatch>): MatrxDataTableQueryState {
  const { search, page, page_size: pageSize, sort } = patch;
  const queryChanged = Object.keys(patch).some((key) => key !== "page" && key !== "show_silenced");
  const columnFilters = { ...current.columnFilters };
  if (patch.source_key !== undefined) columnFilters.sourceKey = patch.source_key === null ? undefined : { kind: "text", value: patch.source_key };
  if (patch.source_kind !== undefined) columnFilters.sourceKind = patch.source_kind === null ? undefined : { kind: "select", value: patch.source_kind };
  if (patch.surface_name !== undefined) columnFilters.surfaceName = patch.surface_name === null ? undefined : { kind: "text", value: patch.surface_name };
  return nextQueryState(current, {
    columnFilters,
    ...(search !== undefined ? { search } : {}),
    ...(pageSize !== undefined ? { pageSize } : {}),
    ...(sort !== undefined ? { sort } : {}),
    ...(page !== undefined ? { page } : {}),
  }, { resetPage: queryChanged && page === undefined });
}

export const assistUpdateSchema = z.object({
  id: z.string().uuid(),
  starred: z.boolean().optional(),
  status: z.enum(["pending", "dismissed"]).optional(),
  snooze: z.enum(["1d", "7d", "30d"]).optional(),
}).strict().refine((value) => [value.starred, value.status, value.snooze].filter((field) => field !== undefined).length === 1, "Send exactly one of starred, status, or snooze per assist.")
  .refine((value) => value.status === undefined || value.snooze === undefined, "Send status or snooze, not both.");

export function parseAssistUpdates(value: unknown, rows: readonly Pick<Assist, "id" | "title" | "status">[], loaded: boolean) {
  if (!loaded) throw new Error("Wait for the current assist view to load before updating its rows. Nothing was changed.");
  const plans = collectProblems("update_assists", readCollectionList("update_assists", "assists", value), (raw) => {
    const plan = assistUpdateSchema.parse(raw);
    const row = rows.find((candidate) => candidate.id === plan.id);
    if (!row) throw new Error(`Assist ${plan.id} is not in the loaded page. Open its view first.`);
    if (plan.snooze && row.status !== "pending") throw new Error(`Assist ${plan.id} is not pending and cannot be snoozed.`);
    return { ...plan, title: row.title };
  });
  refuseRepeats("update_assists", plans.map((plan) => plan.id), "assist ids");
  return plans;
}
