/**
 * @jest-environment jsdom
 */
// WHO KEEPS ACCESS AFTER A MOVE (AT-REVIEWFIX I2, 2026-10-19). A share travels with a base, so a person who is not a member
// of the target workspace keeps reaching it. The Move dialog names them before the person confirms, each with "Remove their
// access" (default: keep), and takes back only the ticked people's shares, only after the move succeeded.
// RED on the prior bytes: the dialog never asked custom.base_move_access_kept and named nobody.
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const baseMove = jest.fn();
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => ({ baseMove }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }));
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
const baseMoveAccessKept = jest.fn();
const baseMoveRemoveAccess = jest.fn();
jest.mock("../baseStore", () => ({
  ...jest.requireActual("../baseStore"),
  baseMoveAccessKept: (...a: unknown[]) => baseMoveAccessKept(...a),
  baseMoveRemoveAccess: (...a: unknown[]) => baseMoveRemoveAccess(...a),
}));
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

let root: Root | null = null;
let el: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  el?.remove();
  root = null;
  baseMove.mockReset();
  baseMoveAccessKept.mockReset();
  baseMoveRemoveAccess.mockReset();
});
function mount(node: React.ReactElement) {
  el = document.createElement("div");
  document.body.append(el);
  root = createRoot(el);
  act(() => root!.render(node));
  return el;
}
const settle = async () => { for (let i = 0; i < 20; i += 1) await act(async () => Promise.resolve()); };
const buttonNamed = (host: HTMLElement, words: string) => [...host.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === words);
const KEPT = [{ user_id: "u-1", name: "Rosa Diaz", email: "rosa@example.com", shares: 1, level: "viewer" }];

async function chooseBayview(host: HTMLElement) {
  const select = host.querySelector<HTMLSelectElement>('select[aria-label="Workspace"]')!;
  await act(async () => { select.value = "org-b"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle();
}

it("names who keeps access before the move, and by default takes nobody's access away", async () => {
  baseMoveAccessKept.mockResolvedValue(KEPT);
  baseMove.mockResolvedValue({ ok: true, data: {} });
  const host = mount(<MoveBaseDialog open onClose={() => undefined} homeId="home-1" name="Harbor Base" organizationId="org-a" tableCount={2} />);
  await chooseBayview(host);
  expect(baseMoveAccessKept).toHaveBeenCalledWith("home-1", "org-b");
  const row = host.querySelector('[data-base-move-kept-person="u-1"]');
  expect(row?.textContent).toContain("Rosa Diaz");
  expect(row?.textContent).toContain("Remove their access");
  expect(host.querySelector<HTMLInputElement>('[data-base-move-remove="u-1"]')!.checked).toBe(false);
  await act(async () => buttonNamed(host, "Move base")!.click());
  await settle();
  expect(baseMove).toHaveBeenCalledTimes(1);
  expect(baseMoveRemoveAccess).not.toHaveBeenCalled();
});

it("takes back the ticked person's access only after the move succeeded", async () => {
  baseMoveAccessKept.mockResolvedValue(KEPT);
  baseMove.mockResolvedValueOnce({ ok: false, error: { code: "conflict", message: "Harbor Base is already in that workspace." } }).mockResolvedValueOnce({ ok: true, data: {} });
  baseMoveRemoveAccess.mockResolvedValue({ removed: 1, message: "Removed 1 share." });
  const host = mount(<MoveBaseDialog open onClose={() => undefined} homeId="home-1" name="Harbor Base" organizationId="org-a" tableCount={2} />);
  await chooseBayview(host);
  await act(async () => host.querySelector<HTMLInputElement>('[data-base-move-remove="u-1"]')!.click());
  await act(async () => buttonNamed(host, "Move base")!.click());
  await settle();
  expect(baseMoveRemoveAccess).not.toHaveBeenCalled(); // the move refused: nobody's access changes
  await act(async () => buttonNamed(host, "Move base")!.click());
  await settle();
  expect(baseMoveRemoveAccess).toHaveBeenCalledWith("home-1", ["u-1"]);
});

it("names nobody when nobody keeps access", async () => {
  baseMoveAccessKept.mockResolvedValue([]);
  const host = mount(<MoveBaseDialog open onClose={() => undefined} homeId="home-1" name="Harbor Base" organizationId="org-a" tableCount={2} />);
  await chooseBayview(host);
  expect(host.querySelector("[data-base-move-kept]")).toBeNull();
});
