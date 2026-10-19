/**
 * @jest-environment jsdom
 */
// A BIG BASE MOVES AS A SERVER JOB (AT-MOVEJOB, 2026-10-19). Above records.base_move_direct_max_rows the dialog never calls
// the direct door (it cannot fit the browser's statement budget): it starts POST /base-move/jobs, shows a progress line,
// follows GET /base-move/jobs/{id}, shows the job's refusal sentence with Try again, and Try again queues the job again.
// A small base still moves directly. RED on the prior bytes: the dialog called baseMove for every base.
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const baseMove = jest.fn();
const tableRowCounts = jest.fn();
const refresh = jest.fn();
const postJson = jest.fn();
const getJson = jest.fn();
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => ({ baseMove, tableRowCounts }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: jest.fn() }) }));
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

import { MoveBaseDialog } from "../BaseScreens";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TOO_LONG = "That took too long. Nothing was lost; try again.";
let root: Root | null = null;
let el: HTMLDivElement | null = null;
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => {
  act(() => root?.unmount());
  el?.remove();
  root = null;
  for (const f of [baseMove, tableRowCounts, refresh, postJson, getJson]) f.mockReset();
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
const choose = (host: HTMLElement) => act(() => {
  const s = host.querySelector("select[aria-label=Workspace]") as HTMLSelectElement;
  s.value = "org-b";
  s.dispatchEvent(new Event("change", { bubbles: true }));
});

test("a base above the direct budget moves as a server job, with a progress line, the job's sentence and Try again", async () => {
  tableRowCounts.mockResolvedValue({ ok: true, data: [{ table_id: "t1", visible_rows: 1000 }, { table_id: "t2", visible_rows: 1000 }] });
  postJson.mockResolvedValueOnce({ data: { job_id: "job-1" } }).mockResolvedValueOnce({ data: { job_id: "job-2" } });
  getJson
    .mockResolvedValueOnce({ data: { state: "running", phase: "moving" } })
    .mockResolvedValueOnce({ data: { state: "refused", code: "timed_out", message: TOO_LONG } })
    .mockResolvedValueOnce({ data: { state: "moved", result: { moved: true } } });
  const host = mount(<MoveBaseDialog open onClose={() => undefined} homeId="home-1" name="Harbor Base" organizationId="org-a" tableCount={2} tableIds={["t1", "t2"]} />);
  choose(host);
  await act(async () => { buttonNamed(host, "Move base")!.click(); });
  await settle();
  expect(baseMove).not.toHaveBeenCalled();
  expect(postJson).toHaveBeenCalledWith("/base-move/jobs", { home_id: "home-1", to_organization_id: "org-b" }, { organizationId: "org-a" });
  expect(host.querySelector("[data-base-move-progress]")?.textContent).toContain("Moving 2 tables, 2,000 rows");
  await tick();
  expect(getJson).toHaveBeenCalledWith("/base-move/jobs/job-1", { organizationId: "org-a" });
  expect(host.querySelector("[data-base-move-progress]")?.textContent).toMatch(/Moving 2 tables, 2,000 rows… \d+ s/);
  await tick();
  expect(host.querySelector("[data-base-move-refused]")?.textContent).toContain(TOO_LONG);
  await act(async () => { buttonNamed(host, "Try again")!.click(); });
  await settle();
  expect(postJson).toHaveBeenCalledTimes(2);
  expect(postJson.mock.calls[1]![1]).toEqual({ home_id: "home-1", to_organization_id: "org-b" });
  await tick();
  expect(getJson).toHaveBeenLastCalledWith("/base-move/jobs/job-2", { organizationId: "org-a" });
  expect(refresh).toHaveBeenCalled();
  expect(baseMove).not.toHaveBeenCalled();
});

test("a base at or under the direct budget still moves directly", async () => {
  tableRowCounts.mockResolvedValue({ ok: true, data: [{ table_id: "t1", visible_rows: 30 }, { table_id: "t2", visible_rows: 30 }] });
  baseMove.mockResolvedValueOnce({ ok: false, error: { code: "conflict", message: "Harbor Base is already in that workspace." } });
  const host = mount(<MoveBaseDialog open onClose={() => undefined} homeId="home-1" name="Harbor Base" organizationId="org-a" tableCount={2} tableIds={["t1", "t2"]} />);
  choose(host);
  await act(async () => { buttonNamed(host, "Move base")!.click(); });
  await settle();
  expect(baseMove).toHaveBeenCalledWith({ home_id: "home-1", to_organization_id: "org-b" });
  expect(postJson).not.toHaveBeenCalled();
});
