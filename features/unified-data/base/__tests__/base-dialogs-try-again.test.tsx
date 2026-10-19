/**
 * @jest-environment jsdom
 */
// TRY AGAIN RE-RUNS THE SAME ACT (AT-SLOW-2, 2026-10-19). A busy store cancels a base move or a rename at its statement
// timeout. Before: the dialog showed the sentence and nothing to press but Cancel. Now the notice carries "Try again",
// and it runs the same move (same base, same workspace) or the same save (same name) again.
// RED on the prior bytes: no "Try again" in either dialog.
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

import { EditDialog, MoveBaseDialog } from "../BaseScreens";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TIMED_OUT = { code: "timed_out", sqlstate: "57014", message: "That took too long. Nothing was lost; try again." };
let root: Root | null = null;
let el: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  el?.remove();
  root = null;
  baseMove.mockReset();
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

it("a timed-out base move offers Try again, which moves the same base to the same workspace again", async () => {
  baseMove.mockResolvedValueOnce({ ok: false, error: TIMED_OUT }).mockResolvedValueOnce({ ok: false, error: { code: "conflict", message: "Harbor Base is already in that workspace." } });
  const host = mount(<MoveBaseDialog open onClose={() => undefined} homeId="home-1" name="Harbor Base" organizationId="org-a" tableCount={2} />);
  const select = host.querySelector<HTMLSelectElement>('select[aria-label="Workspace"]')!;
  await act(async () => {
    select.value = "org-b";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => buttonNamed(host, "Move base")!.click());
  await settle();
  expect(host.textContent).toContain("That took too long");
  const retry = buttonNamed(host, "Try again");
  expect(retry).toBeDefined();
  await act(async () => retry!.click());
  await settle();
  expect(baseMove).toHaveBeenCalledTimes(2);
  expect(baseMove.mock.calls[1]![0]).toEqual({ home_id: "home-1", to_organization_id: "org-b" });
});

it("a timed-out rename offers Try again, which saves the same name again", async () => {
  const onSave = jest.fn().mockRejectedValueOnce(new Error("canceling statement due to statement timeout")).mockResolvedValueOnce(undefined);
  const host = mount(<EditDialog open onClose={() => undefined} current={null} fallbackName="Harbor Base" onSave={onSave} />);
  await act(async () => buttonNamed(host, "Save")!.click());
  await settle();
  expect(host.textContent).toContain("That took too long");
  expect(host.textContent).not.toContain("canceling statement");
  await act(async () => buttonNamed(host, "Try again")!.click());
  await settle();
  expect(onSave).toHaveBeenCalledTimes(2);
  expect(onSave.mock.calls[1]![0]).toMatchObject({ name: "Harbor Base" });
  expect(buttonNamed(host, "Try again")).toBeUndefined();
});
