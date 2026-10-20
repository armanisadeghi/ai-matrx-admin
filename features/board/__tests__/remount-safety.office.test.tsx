/**
 * Remount safety — the Office items: workbook and presentation.
 *
 * SUT: each type's `Body` from `items/catalog.ts` (`WorkbookRecord`, `PresentationRecord`), mounted
 * as the board mounts a tile (`remount-safety/harness.tsx`), over the real store and the recording
 * service boundary. The spreadsheet / slide editors paint on canvas and cannot boot in jsdom: each
 * stands in at its own component door (a plain element that shows the record's name and its chrome),
 * and the case asserts on what the tile above it does — reads its record, keeps it, stays quiet.
 */

jest.mock("@/utils/supabase/client", () => {
  const { createFakeSupabase } = jest.requireActual("./remount-safety/fake-backend");
  const client = createFakeSupabase();
  return { createClient: () => client, supabase: client };
});
jest.mock("next/navigation", () => jest.requireActual("./remount-safety/next-navigation"));
jest.mock("@/features/workbooks/components/WorkbookEditor", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require("react") as typeof import("react");
  return {
    __esModule: true,
    default: ({ workbookName, chrome }: { workbookName: string; chrome: { title: import("react").ReactNode } }) =>
      R.createElement("div", { "data-editor": "workbook" }, workbookName, chrome.title),
  };
});

// The records engine (a grid the CRM record offers behind a tab) is the package's own; it has no bearing on the tile.
jest.mock("@ai-matrx/records-ui", () => new Proxy({ __esModule: true }, { get: (target, key) => (key in target ? (target as Record<PropertyKey, unknown>)[key] : () => null) }));

import "@/lib/sheets-host";
import { BOARD_ITEM_TYPES } from "../items/catalog";
import { expectRemountSafe, runCycle } from "./remount-safety/harness";
import { installBrowserGaps } from "./remount-safety/browser-gaps";
import { ORGANIZATION, PERSON } from "./remount-safety/people";
import { seed, seedRpc } from "./remount-safety/fake-backend";
import { remountType } from "./remount-safety/cases";

installBrowserGaps();

const type = (key: string) => {
  const t = BOARD_ITEM_TYPES.find((x) => x.key === key);
  if (!t) throw new Error(`no board item type ${key}`);
  return t;
};
const shows = (container: HTMLElement, text: string) => (container.textContent ?? "").includes(text);

/** What `entity_access_summary` answers for a record its viewer owns (the access panel under a record tile). */
const accessSummaryOf = (entityType: string, entityId: string) => ({
  entity_type: entityType,
  entity_id: entityId,
  owner_id: PERSON.id,
  viewer_is_owner: true,
  can_manage: true,
  direct_grants: [],
  containers: [],
});

const WORKBOOK_ID = "3f8a1c6e-92d4-4b07-a5e3-1c7d0b9f2a64";
const WORKBOOK_NAME = "Rent roll 2027";
const workbookRow = {
  created_at: "2026-09-30T19:00:00.000Z",
  created_by: PERSON.id,
  custom_fields: {},
  deleted_at: null,
  description: "Every unit, its rent and its lease end.",
  id: WORKBOOK_ID,
  is_public: false,
  metadata: {},
  organization_id: ORGANIZATION.id,
  original_file_id: null,
  project_id: null,
  published_to_web: false,
  published_to_web_at: null,
  published_to_web_by: null,
  shown_to: null,
  source: "created",
  task_id: null,
  test_expires_at: null,
  test_run_id: null,
  updated_at: "2026-09-30T19:00:00.000Z",
  updated_by: PERSON.id,
  user_id: PERSON.id,
  version: 1,
  visibility: "internal",
  workbook_name: WORKBOOK_NAME,
};

// Break: the workbook tile re-reads its workbook (and its access) on wake / remount instead of
// keeping them, or drops to its boot spinner while it does.
remountType(
  "workbook",
  () =>
    runCycle(type("workbook"), { kind: "entity", entity: "workbook", id: WORKBOOK_ID }, {
      title: WORKBOOK_NAME,
      prepare: () => {
        seed("workbench.udt_workbooks", [workbookRow]);
        seedRpc("get_share_capabilities", { publish_lane: "published_to_web", public_state_kind: null, public_state_column: null });
      },
      loadMs: 1500,
      kept: (tile) => ({ editor: tile.container.querySelector('[data-editor="workbook"]') !== null, name: shows(tile.container, WORKBOOK_NAME) }),
    }),
  (r) => expectRemountSafe(r, { editor: true, name: true }, [/^workbench\.udt_workbooks$/]),
);

// ─── Person or company (CRM) ─────────────────────────────────────────────────
const PARTY_ID = "c7e1a4d9-5b32-4f68-9d0a-2e8b6c3f1a75";
const PARTY_NAME = "Priya Raman";
const partyRow = {
  id: PARTY_ID,
  organization_id: ORGANIZATION.id,
  party_kind: "person",
  display_name: PARTY_NAME,
  first_name: "Priya",
  last_name: "Raman",
  job_title: "Property owner",
  record_class: "primary",
  canonical_id: null,
  deleted_at: null,
  created_at: "2026-09-30T19:00:00.000Z",
  updated_at: "2026-09-30T19:00:00.000Z",
  employer: null,
};

// Break: the CRM record keeps its detail (contact points, employment, timeline) in component state
// and re-reads all of it on wake / remount, dropping to its skeleton while it does.
remountType(
  "party",
  () =>
    runCycle(type("party"), { kind: "entity", entity: "party", id: PARTY_ID }, {
      title: PARTY_NAME,
      prepare: () => {
        seed("crm.party", [partyRow]);
      },
      loadMs: 1500,
      kept: (tile) => ({ record: shows(tile.container, PARTY_NAME), loading: tile.container.querySelector('[aria-busy="true"]') !== null }),
    }),
  (r) => expectRemountSafe(r, { record: true, loading: false }, [/^crm\./]),
);

// ─── Transcript ──────────────────────────────────────────────────────────────
const TRANSCRIPT_ID = "e2d4f6a8-1b3c-4d5e-8f70-9a1b2c3d4e5f";
const TRANSCRIPT_TITLE = "Walk-through, Unit 4B";
const TRANSCRIPT_LINE = "The carpet in the second bedroom needs to be replaced.";
const transcriptRow = {
  id: TRANSCRIPT_ID,
  created_by: PERSON.id,
  organization_id: ORGANIZATION.id,
  title: TRANSCRIPT_TITLE,
  description: "Move-out inspection with the tenant.",
  segments: [{ id: "s1", start: 0, end: 5, timecode: "00:00", speaker: "Dana", text: TRANSCRIPT_LINE }],
  metadata: { duration: 5, wordCount: 10, segmentCount: 1, speakers: ["Dana"] },
  audio_file_path: null,
  video_file_path: null,
  source_type: "other",
  tags: [],
  folder_name: "Transcripts",
  is_draft: false,
  draft_saved_at: null,
  created_at: "2026-09-30T19:00:00.000Z",
  updated_at: "2026-09-30T19:00:00.000Z",
  deleted_at: null,
};

// Break: the transcript tile re-reads its transcript on wake / remount (it is read by id once and
// kept in the transcripts store), or drops to its spinner while it does.
remountType(
  "transcript",
  () =>
    runCycle(type("transcript"), { kind: "entity", entity: "transcript", id: TRANSCRIPT_ID }, {
      title: TRANSCRIPT_TITLE,
      prepare: () => {
        seed("transcripts.transcripts", [transcriptRow]);
      },
      loadMs: 3000,
      kept: (tile) => ({ line: shows(tile.container, TRANSCRIPT_LINE), loading: tile.container.querySelector('[aria-busy="true"]') !== null }),
    }),
  (r) => expectRemountSafe(r, { line: true, loading: false }, [/^transcripts\.transcripts$/]),
);

// ─── Agent ───────────────────────────────────────────────────────────────────
const AGENT_ID = "a9c3e7b1-4d26-4f80-b5a2-6e1d8c0f3b97";
const AGENT_NAME = "Lease Summarizer";
const AGENT_INSTRUCTION = "Summarize the lease in plain language and list every date the tenant must act on.";
const agentRow = {
  id: AGENT_ID,
  name: AGENT_NAME,
  description: "Reads a lease and lists what the tenant must do.",
  agent_type: "user",
  organization_id: ORGANIZATION.id,
  user_id: PERSON.id,
  is_active: true,
  is_archived: false,
  is_public: false,
  version: 1,
  model_id: null,
  messages: [{ role: "system", content: [{ type: "text", text: AGENT_INSTRUCTION }] }],
  variable_definitions: [],
  settings: {},
  tools: [],
  custom_tools: [],
  context_policies: [],
  mcp_servers: [],
  tags: [],
  category: null,
  output_schema: null,
  created_at: "2026-09-30T19:00:00.000Z",
  updated_at: "2026-09-30T19:00:00.000Z",
};

// Break: the agent tile re-reads the agent's full definition (and its version history and model
// catalog) on wake / remount instead of keeping it in the agent store, or drops to its loading line.
remountType(
  "agent",
  () =>
    runCycle(type("agent"), { kind: "entity", entity: "agent", id: AGENT_ID }, {
      title: AGENT_NAME,
      prepare: () => {
        seed("agent.definition", [agentRow]);
        seedRpc("agx_get_version_history", []);
        seedRpc("agx_get_list_full", []);
        seedRpc("agx_search", []);
        seedRpc("entity_access_summary", accessSummaryOf("agent", AGENT_ID));
      },
      loadMs: 1500,
      kept: (tile) => ({ instruction: shows(tile.container, AGENT_INSTRUCTION), loading: shows(tile.container, "Loading agent data") }),
    }),
  (r) => expectRemountSafe(r, { instruction: true, loading: false }, [/^agent\.definition$/]),
);

// ─── Presentation ────────────────────────────────────────────────────────────
const PRESENTATION_ID = "5d7f9b1e-3a4c-4e68-90a2-7c1b3d5f8e46";
const PRESENTATION_NAME = "Q4 owner update";
const SLIDE_TITLE = "Occupancy reached 96 percent";
const presentationRow = {
  id: PRESENTATION_ID,
  name: PRESENTATION_NAME,
  description: null,
  deck: {
    __kind: "presentation_deck",
    title: PRESENTATION_NAME,
    slides: [{ __kind: "presentation_slide", id: "s1", layout: "title", title: SLIDE_TITLE, subtitle: "Harborview Properties" }],
  },
  source: "created",
  project_id: null,
  organization_id: ORGANIZATION.id,
  created_by: PERSON.id,
  visibility: "internal",
  deleted_at: null,
  created_at: "2026-09-30T19:00:00.000Z",
  updated_at: "2026-09-30T19:00:00.000Z",
};

// Break: the presentation tile re-reads its deck (and access) on wake / remount instead of keeping
// them, or loses the slide the person is on.
remountType(
  "presentation",
  () =>
    runCycle(type("presentation"), { kind: "entity", entity: "presentation", id: PRESENTATION_ID }, {
      title: PRESENTATION_NAME,
      prepare: () => {
        seed("workbench.presentation", [presentationRow]);
        seedRpc("get_share_capabilities", { publish_lane: "published_to_web", public_state_kind: null, public_state_column: null });
      },
      loadMs: 1500,
      kept: (tile) => ({ slide: shows(tile.container, SLIDE_TITLE) || tile.container.innerHTML.includes(SLIDE_TITLE) }),
    }),
  (r) => expectRemountSafe(r, { slide: true }, [/^workbench\.presentation$/]),
);
