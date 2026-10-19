/**
 * @jest-environment jsdom
 */
// A BIG BASE'S SNAPSHOT AND RESTORE RUN AS THE BASE-MOVE SERVER JOB (AT-SNAPJOB, 2026-10-19). Above
// records.base_move_direct_max_rows the Snapshots dialog never loops the copy doors in the browser (a 1,050-row base took
// > 4 min and never showed its snapshot): it starts POST /base-move/snapshot-jobs (or /restore-jobs), shows a progress line
// with rows done of total, then saves the snapshot row / names the new base from the job's result. A small base stays direct.
// RED on the prior bytes: the dialog called snapshotBase / restoreSnapshot for every base and had no progress line.
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const baseMove = jest.fn();
const tableRowCounts = jest.fn();
const refresh = jest.fn();
const postJson = jest.fn();
const getJson = jest.fn();
jest.mock("@/features/organizations/components/OrganizationChooser", () => ({
  OrganizationChooser: ({ value, onChange, excludeId }: { value: string | null; onChange: (o: { id: string; name: string; slug: string }) => void; excludeId?: string | null }) => (
    <select aria-label="Workspace" value={value ?? ""} onChange={(e) => onChange({ id: e.target.value, name: e.target.value, slug: "" })}>
      {[{ id: "", name: "Choose a workspace" }, { id: "org-a", name: "Harbor Clinic" }, { id: "org-b", name: "Bayview Clinic" }].filter((o) => o.id !== excludeId).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  ),
}));
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => ({ baseMove, tableRowCounts }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
jest.mock("@/lib/knobs/featureKnobs", () => ({ knobInt: async () => 250 }));
jest.mock("@/lib/python-client", () => ({ postJson: (...a: unknown[]) => postJson(...a), getJson: (...a: unknown[]) => getJson(...a) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => [{ id: "org-a", name: "Harbor Clinic" }, { id: "org-b", name: "Bayview Clinic" }] }));
jest.mock("@/features/scopes/redux/selectors/tree", () => ({ selectOrganizationsList: () => [] }));
jest.mock("@/features/unified-data/table-page/TableAccessBar", () => ({ ActivityFeedButton: () => null }));
jest.mock("@/features/make/MakeMount", () => ({ MakeMount: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/features/unified-data/objectOrganization", () => ({ useObjectOrganization: () => ({ state: "resolving" }) }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/features/organizations/useOrganizationRequired", () => ({ useOrganizationRequired: () => null }));
jest.mock("../AirtableImportDialog", () => ({ AirtableImportDialog: () => null }));
jest.mock("../SheetsImportDialog", () => ({ SheetsImportDialog: () => null }));
jest.mock("../GithubImportDialog", () => ({ GithubImportDialog: () => null }));
jest.mock("../useBasePort", () => ({ useBasePort: () => ({}) }));
const snapshotBase = jest.fn();
const restoreSnapshot = jest.fn();
jest.mock("@ai-matrx/records", () => ({
  ...jest.requireActual("@ai-matrx/records"),
  snapshotBase: (...a: unknown[]) => snapshotBase(...a),
  restoreSnapshot: (...a: unknown[]) => restoreSnapshot(...a),
}));
const listSnapshots = jest.fn();
const saveSnapshot = jest.fn();
const saveBase = jest.fn();
jest.mock("../baseStore", () => ({
  ...jest.requireActual("../baseStore"),
  listSnapshots: (...a: unknown[]) => listSnapshots(...a),
  saveSnapshot: (...a: unknown[]) => saveSnapshot(...a),
  saveBase: (...a: unknown[]) => saveBase(...a),
}));
const push = jest.fn();
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Button: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => {
    const { variant: _v, ...rest } = p;
    return <button type="button" {...rest}>{children}</button>;
  },
  Field: (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} />,
  Select: ({ value, onValueChange, options, "aria-label": label }: { value: string; onValueChange: (v: string) => void; options: Array<{ value: string; label: string }>; "aria-label"?: string }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

import { SnapshotsDialog } from "../BaseScreens";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let el: HTMLDivElement | null = null;
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => {
  act(() => root?.unmount());
  el?.remove();
  root = null;
  for (const f of [baseMove, tableRowCounts, refresh, postJson, getJson, snapshotBase, restoreSnapshot, listSnapshots, saveSnapshot, saveBase, push]) f.mockReset();
  jest.useRealTimers();
});
function mount(node: React.ReactElement) {
  el = document.createElement("div");
  document.body.append(el);
  root = createRoot(el);
  act(() => root!.render(node));
  return el;
}
const settle = async () => { for (let i = 0; i < 20; i += 1) await act(async () => Promise.resolve()); };
const tick = async () => { await act(async () => { jest.advanceTimersByTime(1000); }); await settle(); };
const buttonNamed = (host: HTMLElement, words: string) => [...host.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === words);
const identity = { id: "base-1", name: "Harbor Base", icon: null, color: null, description: null } as never;
const TABLES = [{ id: "t1", name: "Tasks" }] as never;
const SNAP_TABLES = [{ table_id: "t1", snapshot_table_id: "s1", name: "Tasks", records: 1050 }];
const dialog = () => <SnapshotsDialog open onClose={() => undefined} homeId="home-1" organizationId="org-a" name="Harbor Base" tables={TABLES} identity={identity} onNeedIdentity={async () => identity} />;

test("a big base's snapshot runs as the server job with a rows-done progress line, then the snapshot row is saved", async () => {
  listSnapshots.mockResolvedValue([]);
  tableRowCounts.mockResolvedValue({ ok: true, data: [{ table_id: "t1", visible_rows: 1050 }] });
  postJson.mockResolvedValueOnce({ data: { job_id: "job-s" } });
  getJson
    .mockResolvedValueOnce({ data: { state: "running", kind: "snapshot", phase: "copying", progress: { table: "Tasks", at: 1, of: 1, done: 275, total: 1050, seconds: 6.2 } } })
    .mockResolvedValueOnce({ data: { state: "done", kind: "snapshot", result: { label: "Before", origin: "manual", tables: SNAP_TABLES } } });
  const host = mount(dialog());
  await settle();
  act(() => {
    const f = host.querySelector("input[aria-label='Snapshot label']") as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(f, "Before");
    f.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => { (host.querySelector("[data-snapshot-take]") as HTMLButtonElement).click(); });
  await settle();
  expect(snapshotBase).not.toHaveBeenCalled();
  expect(postJson).toHaveBeenCalledWith("/base-move/snapshot-jobs",
    { organization_id: "org-a", home_id: "home-1", tables: [{ id: "t1", name: "Tasks" }], label: "Before", origin: "manual" }, { organizationId: "org-a" });
  expect(getJson).toHaveBeenCalledWith("/base-move/jobs/job-s", { organizationId: "org-a" });
  expect(host.querySelector("[data-snapshot-progress]")?.textContent).toBe("Copying Tasks: 275 of 1,050 rows… 6 s");
  await tick();
  expect(saveSnapshot).toHaveBeenCalledWith("org-a", "base-1", { label: "Before", origin: "manual", tables: SNAP_TABLES });
  expect(host.querySelector("[data-snapshot-progress]")).toBeNull();
});

test("a big snapshot restores as the server job and opens the new base", async () => {
  listSnapshots.mockResolvedValue([{ id: "snap-1", label: "Before", origin: "manual", tables: SNAP_TABLES, created_at: "2026-10-19T18:00:00Z" }]);
  postJson.mockResolvedValueOnce({ data: { job_id: "job-r" } });
  getJson
    .mockResolvedValueOnce({ data: { state: "running", kind: "restore", phase: "copying", progress: { table: "Tasks", at: 1, of: 1, done: 500, total: 1050, seconds: 9 } } })
    .mockResolvedValueOnce({ data: { state: "done", kind: "restore", result: { home_id: "home-new", tables: [{}] } } });
  const host = mount(dialog());
  await settle();
  await act(async () => { (host.querySelector("[data-snapshot-restore]") as HTMLButtonElement).click(); });
  await settle();
  expect(restoreSnapshot).not.toHaveBeenCalled();
  expect(postJson.mock.calls[0]![0]).toBe("/base-move/restore-jobs");
  expect(postJson.mock.calls[0]![1]).toMatchObject({ organization_id: "org-a", snapshot_id: "snap-1", tables: SNAP_TABLES });
  expect(host.querySelector("[data-snapshot-progress]")?.textContent).toBe("Copying Tasks: 500 of 1,050 rows… 9 s");
  await tick();
  expect(saveBase).toHaveBeenCalledWith("org-a", "home-new", expect.objectContaining({ template: "restore" }));
  expect(push).toHaveBeenCalledWith("/data/bases/home-new");
});

test("a small base's snapshot stays on the direct path", async () => {
  listSnapshots.mockResolvedValue([]);
  tableRowCounts.mockResolvedValue({ ok: true, data: [{ table_id: "t1", visible_rows: 30 }] });
  snapshotBase.mockResolvedValueOnce({ ok: true, snapshot: { label: "x", origin: "manual", tables: [] } });
  const host = mount(dialog());
  await settle();
  await act(async () => { (host.querySelector("[data-snapshot-take]") as HTMLButtonElement).click(); });
  await settle();
  expect(snapshotBase).toHaveBeenCalled();
  expect(postJson).not.toHaveBeenCalled();
});
