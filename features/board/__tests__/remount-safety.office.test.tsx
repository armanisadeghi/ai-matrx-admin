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
