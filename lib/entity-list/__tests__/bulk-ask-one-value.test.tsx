/**
 * ONE VALUE FOR THE WHOLE SELECTION (the bulk twin rule, 2026-10-21).
 *
 * A row verb that needs a value (an expiry date, a status to set) used to have no bulk twin, or a
 * hand-built dialog beside the table (spend approvals' "Temporary"). `EntityBulkActionConfirm.ask`
 * puts ONE date or ONE choice under the confirm; the value reaches `run` as `input.value`.
 *
 * RED against the pre-change shell: `ask` was ignored, the confirm was a plain yes/no and `run`
 * received `{}` — "the picked date reaches run" fails.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

jest.mock("@/lib/toast", () => ({
  toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
  toastErrorAlreadyCaptured: () => undefined,
}));
const plainConfirm = jest.fn(async () => true);
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: () => plainConfirm() }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

import { EntityBulkActions } from "../components/EntityBulkBar";
import type { EntityBulkAction, EntityBulkSelection } from "../selection";

type Row = { id: string };
const target: EntityBulkSelection<Row> = {
  mode: "ids",
  ids: ["a", "b"],
  rows: [{ id: "a" }, { id: "b" }],
  count: 2,
  filter: {} as EntityBulkSelection<Row>["filter"],
};

async function mount(action: EntityBulkAction<Row>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <EntityBulkActions
        actions={[action]}
        selection={{ build: () => target, clear: jest.fn(), count: 2 }}
        noun="approval"
        onRemoveRows={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );
  });
  return root;
}
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
const buttons = (name: string) =>
  [...document.querySelectorAll("button")].filter((button) => button.textContent?.trim() === name);
async function click(element: Element | null | undefined) {
  if (!element) throw new Error("missing element");
  await act(async () => { (element as HTMLElement).click(); });
  await flush();
}
const dateBox = () => document.querySelector<HTMLInputElement>('[data-entity-bulk-ask="date"] input[type="date"]');
async function setDate(value: string) {
  const box = dateBox();
  if (!box) throw new Error("no date box");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(box, value);
    box.dispatchEvent(new Event("input", { bubbles: true }));
    box.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
const confirmButton = () => buttons("Cancel")[0]?.nextElementSibling as HTMLButtonElement | null;

afterEach(() => { document.body.innerHTML = ""; plainConfirm.mockClear(); });

describe("bulk confirm asks one value", () => {
  it("the picked date reaches run, once, for the whole selection", async () => {
    const run = jest.fn(async () => ({}));
    await mount({
      id: "temporary",
      label: "Temporary",
      confirm: () => ({
        title: "Approve 2 approvals temporarily?",
        description: "Then Rejected.",
        confirmLabel: "Approve until",
        ask: { kind: "date", label: "Expires on", defaultValue: "2030-01-08", min: "2030-01-01" },
      }),
      run,
    });
    await click(document.querySelector('[data-entity-bulk-action="temporary"]'));
    expect(plainConfirm).not.toHaveBeenCalled();
    expect(dateBox()?.value).toBe("2030-01-08");
    await setDate("2030-02-01");
    await click(confirmButton());
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(target, { value: "2030-02-01" });
  });

  it("a date the verb refuses blocks Confirm and names why", async () => {
    const run = jest.fn(async () => ({}));
    await mount({
      id: "temporary",
      label: "Temporary",
      confirm: () => ({
        title: "Approve temporarily?",
        description: "Then Rejected.",
        ask: { kind: "date", label: "Expires on", defaultValue: "2030-01-08", validate: (v) => (v < "2030-01-05" ? "Pick an expiry date after today" : null) },
      }),
      run,
    });
    await click(document.querySelector('[data-entity-bulk-action="temporary"]'));
    await setDate("2030-01-02");
    expect(document.body.textContent).toContain("Pick an expiry date after today");
    expect(confirmButton()?.disabled).toBe(true);
    await click(buttons("Cancel")[0]);
    expect(run).not.toHaveBeenCalled();
  });

  it("a choice opens on its default and reaches run as input.value", async () => {
    const run = jest.fn(async () => ({}));
    await mount({
      id: "set-status",
      label: "Set status",
      confirm: () => ({
        title: "Set status for 2 tasks?",
        description: "Each task moves to the status you pick.",
        ask: { kind: "choice", label: "Status", options: [{ value: "todo", label: "To do" }, { value: "done", label: "Done" }], defaultValue: "done" },
      }),
      run,
    });
    await click(document.querySelector('[data-entity-bulk-action="set-status"]'));
    expect(document.querySelector('[data-entity-bulk-ask="choice"]')).not.toBeNull();
    await click(confirmButton());
    expect(run).toHaveBeenCalledWith(target, { value: "done" });
  });
});
