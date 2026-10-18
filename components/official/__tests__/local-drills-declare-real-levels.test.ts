import {
  drillConfigFromColumns,
  drillDroppedItems,
  drillLevelProblems,
  type MatrxColumnDef,
  type MatrxDataTableLocalDrillConfig,
} from "@ai-matrx/design-system/data-table";
import { TASKS_DRILL } from "@/features/tasks/components/tasksDrill";
import { PROJECTS_DRILL } from "@/features/projects/components/projectsDrill";
import { SHORTCUTS_DRILL } from "@/features/agent-shortcuts/components/shortcutsDrill";
import { ASK_DRILL } from "@/features/question-desk/components/askDrill";
import { OUTREACH_LISTS_DRILL } from "@/features/crm/components/outreach-lists/outreachListsDrill";
import { SURFACES_DRILL } from "@/features/surfaces/components/surfacesDrill";
import { ALL_ITEMS_DRILL } from "@/features/product-capture/components/allItemsDrill";
import { ROSTER_DRILL } from "@/features/organizations/admin/components/rosterDrill";
import { THREADS_DRILL } from "@/features/war-room/components/all/threadsDrill";
import { TRIGGERS_DRILL } from "@/features/scheduling/components/triggers/triggersDrill";
import { DECK_CARDS_DRILL } from "@/features/flashcards/components/set-detail/deckCardsDrill";

type Row = Record<string, unknown>;
type Spec = { id: string; kind: "text" | "number" | "date" | "boolean"; values: unknown[] };

/** The column ids and kinds each page's own table carries, with a few realistic values. */
const PAGES: { name: string; drill: MatrxDataTableLocalDrillConfig; spec: Spec[] }[] = [
  { name: "tasks", drill: TASKS_DRILL, spec: [
    { id: "status", kind: "text", values: ["Open", "Completed"] },
    { id: "project", kind: "text", values: ["Alpha", "Beta", "Unassigned"] },
    { id: "priority", kind: "text", values: ["High", "Medium", "Low", "—"] },
    { id: "dueDate", kind: "date", values: ["2026-10-01", "2026-11-03", null] },
    { id: "updated", kind: "date", values: ["2026-10-02T10:00:00Z", "2026-09-02T10:00:00Z"] },
  ] },
  { name: "projects", drill: PROJECTS_DRILL, spec: [
    { id: "org", kind: "text", values: ["Acme", "Beta Co", "—"] },
    { id: "open", kind: "number", values: [3, 0, 12] },
    { id: "done", kind: "number", values: [5, 1, 0] },
    { id: "updated", kind: "date", values: ["2026-10-02T10:00:00Z", "2026-08-02T10:00:00Z"] },
  ] },
  { name: "shortcuts", drill: SHORTCUTS_DRILL, spec: [
    { id: "category", kind: "text", values: ["Writing", "Research"] },
    { id: "displayMode", kind: "text", values: ["modal", "inline"] },
    { id: "autoRun", kind: "boolean", values: [true, false] },
    { id: "allowChat", kind: "boolean", values: [true, false] },
  ] },
  { name: "ask", drill: ASK_DRILL, spec: [
    { id: "verdict", kind: "text", values: ["Yes", "No", "Waiting"] },
    { id: "kind", kind: "text", values: ["choice", "text"] },
    { id: "door", kind: "text", values: ["chat", "email"] },
  ] },
  { name: "outreach lists", drill: OUTREACH_LISTS_DRILL, spec: [
    { id: "status", kind: "text", values: ["draft", "active"] },
    { id: "list_kind", kind: "text", values: ["media", "sales"] },
    { id: "members", kind: "number", values: [4, 9, 0] },
    { id: "started_at", kind: "date", values: ["2026-10-02T10:00:00Z", null] },
    { id: "updated_at", kind: "date", values: ["2026-10-03T10:00:00Z", "2026-09-03T10:00:00Z"] },
  ] },
  { name: "surfaces", drill: SURFACES_DRILL, spec: [
    { id: "client_name", kind: "text", values: ["web", "desktop"] },
    { id: "readiness", kind: "text", values: ["Ready", "Partial"] },
    { id: "is_active", kind: "boolean", values: [true, false] },
    { id: "executor_name", kind: "text", values: ["local", "server"] },
    { id: "sort_order", kind: "number", values: [1, 2, 3] },
    { id: "agentCount", kind: "number", values: [1, 4, 0] },
    { id: "toolCount", kind: "number", values: [2, 7, 0] },
    { id: "surfaceValueCount", kind: "number", values: [5, 0, 1] },
  ] },
  { name: "captured products", drill: ALL_ITEMS_DRILL, spec: [
    { id: "status", kind: "text", values: ["draft", "done"] },
    { id: "photoCount", kind: "number", values: [3, 0, 8] },
    { id: "videoCount", kind: "number", values: [1, 0, 0] },
    { id: "audioCount", kind: "number", values: [0, 2, 0] },
    { id: "createdAt", kind: "date", values: ["2026-10-02T10:00:00Z", "2026-09-02T10:00:00Z"] },
  ] },
  { name: "member roster", drill: ROSTER_DRILL, spec: [
    { id: "role", kind: "text", values: ["admin", "member"] },
    { id: "status", kind: "text", values: ["active", "suspended"] },
    { id: "tier", kind: "text", values: ["pro", "free"] },
    { id: "last-active", kind: "date", values: ["2026-10-02T10:00:00Z", "2026-08-02T10:00:00Z"] },
    { id: "files", kind: "number", values: [10, 0, 44] },
    { id: "spend", kind: "number", values: [100, 0, 5] },
  ] },
  { name: "war-room threads", drill: THREADS_DRILL, spec: [
    { id: "roomTitle", kind: "text", values: ["Launch", "Ops"] },
    { id: "anchorType", kind: "text", values: ["task", "note"] },
    { id: "isPinned", kind: "boolean", values: [true, false] },
    { id: "updatedAt", kind: "date", values: ["2026-10-02T10:00:00Z", "2026-09-02T10:00:00Z"] },
    { id: "createdAt", kind: "date", values: ["2026-09-02T10:00:00Z", "2026-08-02T10:00:00Z"] },
  ] },
  { name: "workflow triggers", drill: TRIGGERS_DRILL, spec: [
    { id: "workflow", kind: "text", values: ["Digest", "Backfill"] },
    { id: "kind", kind: "text", values: ["schedule", "event"] },
    { id: "state", kind: "text", values: ["Enabled", "Paused"] },
    { id: "created_by", kind: "text", values: ["a@x.test", "b@x.test"] },
    { id: "last_fired", kind: "date", values: ["2026-10-02T10:00:00Z", ""] },
    { id: "runs_7d", kind: "number", values: [3, 0, 21] },
    { id: "runs_30d", kind: "number", values: [30, 1, 90] },
  ] },
  { name: "deck cards", drill: DECK_CARDS_DRILL, spec: [
    { id: "mastery", kind: "text", values: ["New", "Learning", "Known"] },
    { id: "kind", kind: "text", values: ["basic", "cloze"] },
  ] },
];

function build(spec: Spec[]) {
  const columns = spec.map((s): MatrxColumnDef<Row> => {
    const base = { id: s.id, accessorKey: s.id, header: s.id } as MatrxColumnDef<Row>;
    if (s.kind === "number") return { ...base, filter: "number" };
    if (s.kind === "date") return { ...base, format: { id: "datetime" }, filter: "date" };
    if (s.kind === "boolean") return { ...base, filter: "boolean" };
    return { ...base, filter: "select" };
  });
  const rows: Row[] = [];
  for (let i = 0; i < 40; i += 1) {
    const row: Row = {};
    for (const s of spec) row[s.id] = s.values[i % s.values.length];
    rows.push(row);
  }
  return { columns, rows };
}

describe("local drills adopted across the product", () => {
  it.each(PAGES.map((p) => [p.name, p] as const))("%s declares only levels its Dimensions and Measures honor", (_n, page) => {
    const { columns, rows } = build(page.spec);
    const config = drillConfigFromColumns(columns, rows, page.drill);
    expect(drillLevelProblems(config.dimensions, config.measures)).toEqual([]);
    expect(drillDroppedItems(config.dimensions, page.drill)).toEqual([]);
  });

  it.each(PAGES.map((p) => [p.name, p] as const))("%s gives every level its own design (not the default)", (_n, page) => {
    for (const [key, level] of Object.entries(page.drill.levels ?? {})) {
      expect(level.breakouts?.length ?? 0).toBeGreaterThan(0);
      expect(level.breakouts).not.toContain(key);
      expect(level.show?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
