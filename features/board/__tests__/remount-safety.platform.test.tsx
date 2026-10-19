/**
 * Remount safety — the platform items: schedule, knowledge source, visual map, report, sandbox.
 *
 * SUT: each type's `Body` from `items/catalog.ts` (`ScheduleDetail`, `DataStoreRecord`, `MapEditor`,
 * `AgentDriftReport`, `SandboxRecord`, each `embedded`), mounted as the board mounts a tile
 * (`remount-safety/harness.tsx`), over the real store and the recording service boundary. The break
 * each case catches is named above it.
 */

jest.mock("@/utils/supabase/client", () => {
  const { createFakeSupabase } = jest.requireActual("./remount-safety/fake-backend");
  const client = createFakeSupabase();
  return { createClient: () => client, supabase: client };
});
jest.mock("next/navigation", () => jest.requireActual("./remount-safety/next-navigation"));
// The diagram canvas (a graph editor) paints on its own surface and cannot boot in jsdom; the strip above it is the tile's.
jest.mock("@/features/canvas/maps/MapCanvas", () => ({ __esModule: true, default: () => null }));

import { BOARD_ITEM_TYPES } from "../items/catalog";
import { expectRemountSafe, runCycle, type TileHandle } from "./remount-safety/harness";
import { installBrowserGaps } from "./remount-safety/browser-gaps";
import { ORGANIZATION, PERSON } from "./remount-safety/people";
import { seed, seedFetch, seedRpc } from "./remount-safety/fake-backend";
import { remountType } from "./remount-safety/cases";

installBrowserGaps();

const type = (key: string) => {
  const t = BOARD_ITEM_TYPES.find((x) => x.key === key);
  if (!t) throw new Error(`no board item type ${key}`);
  return t;
};
const shows = (tile: TileHandle, text: string) => (tile.container.textContent ?? "").includes(text);
const skeleton = (tile: TileHandle) => tile.container.querySelector('[aria-busy="true"]') !== null;
const STAMP = "2026-09-30T19:00:00.000Z";

// ─── Schedule ────────────────────────────────────────────────────────────────
const SCHEDULE_ID = "6b1d3f5a-7c29-4e84-9a0b-2d4f6a8c1e37";
const SCHEDULE_TITLE = "Monday vacancy digest";
const scheduleRow = {
  id: SCHEDULE_ID,
  user_id: PERSON.id,
  organization_id: ORGANIZATION.id,
  kind: "agent",
  metadata: {},
  title: SCHEDULE_TITLE,
  description: "Lists every unit that has been empty for more than a week.",
  queue: "default",
  surfaces: ["any"],
  enabled: false,
  expires_at: null,
  tags: [],
  next_due_at: null,
  last_run_at: null,
  created_at: STAMP,
  updated_at: STAMP,
  deleted_at: null,
  agent: { agent_id: null, prompt: "List the empty units.", variables: {}, persistent_conversation_id: null, auth_mode: "user", max_runtime_seconds: 600, max_concurrent: 1 },
  triggers: [],
};

// Break: the schedule tile re-reads its schedule (and its run history) on wake / remount instead of
// keeping them in the schedules store, or drops to its skeleton while it does.
remountType(
  "schedule",
  () =>
    runCycle(type("schedule"), { kind: "entity", entity: "schedule", id: SCHEDULE_ID }, {
      title: SCHEDULE_TITLE,
      prepare: () => {
        seed("scheduler.sch_task", [scheduleRow]);
      },
      loadMs: 1500,
      kept: (tile) => ({ title: shows(tile, SCHEDULE_TITLE), loading: skeleton(tile) }),
    }),
  (r) => expectRemountSafe(r, { title: true, loading: false }, [/^scheduler\.sch_task$/, /^scheduler\.sch_run$/]),
);

// ─── Knowledge source ────────────────────────────────────────────────────────
const STORE_ID = "d4a6c8e0-2b4d-4f61-8a3c-5e7f9b1d3a52";
const STORE_NAME = "Lease library";
const storeDetail = {
  id: STORE_ID,
  name: STORE_NAME,
  short_code: null,
  description: "Every signed lease, indexed.",
  kind: "general",
  organization_id: ORGANIZATION.id,
  is_active: true,
  settings: {},
  members: [],
  access: "owner",
  read_only: false,
};

// Break: the knowledge source tile re-reads the store (members, provenance, access) on wake / remount
// instead of keeping them, or drops to its loading line while it does.
remountType(
  "knowledge-source",
  () =>
    runCycle(type("knowledge-source"), { kind: "entity", entity: "knowledge-source", id: STORE_ID }, {
      title: STORE_NAME,
      prepare: () => {
        seedRpc("fn_get_user_data_store", storeDetail);
        seedRpc("fn_list_user_data_stores", [{ id: STORE_ID, name: STORE_NAME, member_count: 0 }]);
      },
      loadMs: 1500,
      kept: (tile) => ({ name: shows(tile, STORE_NAME), loading: shows(tile, "Loading…") }),
    }),
  (r) => expectRemountSafe(r, { name: true, loading: false }, [/^fn_get_user_data_store$/]),
);

// ─── Visual map ──────────────────────────────────────────────────────────────
const MAP_ID = "f2b4d6a8-0c1e-4a35-9b7d-3f5a7c9e1b64";
const MAP_NAME = "How a new patient gets seen";
const mapRow = {
  id: MAP_ID,
  user_id: PERSON.id,
  organization_id: ORGANIZATION.id,
  type: "diagram",
  title: MAP_NAME,
  description: null,
  content: {
    type: "diagram",
    data: {
      title: MAP_NAME,
      nodes: [{ id: "n-1", label: "Patient calls", nodeType: "default", position: { x: 0, y: 0 } }],
      edges: [],
    },
    metadata: { title: MAP_NAME },
  },
  tags: [],
  is_favorited: false,
  is_archived: false,
  published_to_web: false,
  created_at: STAMP,
  updated_at: STAMP,
  deleted_at: null,
};
const mapName = (tile: TileHandle) => tile.container.querySelector<HTMLInputElement>('input[aria-label="Map name"]')?.value ?? null;

// Break: the map tile reads its map again (and stamps `last_accessed_at`, a write) on every wake and
// remount instead of keeping the document it holds, or shows a spinner in place of the canvas.
remountType(
  "visual-map",
  () =>
    runCycle(type("visual-map"), { kind: "entity", entity: "visual-map", id: MAP_ID }, {
      title: MAP_NAME,
      prepare: () => {
        seed("canvas.canvas_items", [mapRow]);
      },
      loadMs: 1500,
      kept: (tile) => ({ name: mapName(tile) }),
    }),
  (r) => expectRemountSafe(r, { name: MAP_NAME }, [/^canvas\.canvas_items$/]),
);

// ─── Report ──────────────────────────────────────────────────────────────────
// Break: the report tile fetches its rollup again on wake / remount instead of keeping it in the
// usages store, or drops to its skeleton rows while it does.
remountType(
  "report",
  () =>
    runCycle(type("report"), { kind: "entity", entity: "report", id: "agent-drift" }, {
      title: "Agent Drift",
      prepare: () => {
        seedRpc("agx_usage_report", []);
      },
      loadMs: 1500,
      kept: (tile) => ({ header: shows(tile, "Agent Drift"), refresh: shows(tile, "Refresh") }),
    }),
  (r) => expectRemountSafe(r, { header: true, refresh: true }, [/^agx_usage_report$/]),
);

// ─── Sandbox ─────────────────────────────────────────────────────────────────
const SANDBOX_ID = "8e0a2c4e-6b8d-4f13-a5c7-9d1f3b5d7e29";
const SANDBOX_NAME = "Rent roll workbench";
const sandboxInstance = {
  id: SANDBOX_ID,
  sandbox_id: "sbx-3f9a21",
  name: SANDBOX_NAME,
  user_id: PERSON.id,
  organization_id: ORGANIZATION.id,
  status: "running",
  tier: "ec2",
  template: "default",
  ttl_seconds: 7200,
  created_at: STAMP,
  updated_at: STAMP,
  expires_at: "2099-01-01T00:00:00.000Z",
  last_heartbeat_at: STAMP,
  stop_reason: null,
  config: {},
  container_id: null,
  proxy_url: null,
  hot_path: "/home/agent",
  cold_path: "/data",
  deleted_at: null,
};

// Break: the sandbox tile re-reads the instance (and restarts its 10-second poll) on wake / remount
// instead of keeping it, or drops to its loading cards while it does.
remountType(
  "sandbox",
  () =>
    runCycle(type("sandbox"), { kind: "entity", entity: "sandbox", id: SANDBOX_ID }, {
      title: SANDBOX_NAME,
      prepare: () => {
        seedFetch(new RegExp(`/api/sandbox/${SANDBOX_ID}$`), () => ({ instance: sandboxInstance }));
      },
      loadMs: 1500,
      kept: (tile) => ({ name: shows(tile, SANDBOX_NAME), loading: skeleton(tile) }),
    }),
  (r) => expectRemountSafe(r, { name: true, loading: false }, [new RegExp(`/api/sandbox/${SANDBOX_ID}$`)]),
);
