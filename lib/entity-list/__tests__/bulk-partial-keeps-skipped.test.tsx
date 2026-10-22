/**
 * A PARTIAL BULK RESULT KEEPS THE SKIPPED ROWS TICKED (the shell rule: keep the selection on
 * failure). Before, any result cleared the whole selection, so the rows that failed lost their
 * ticks and a retry meant re-ticking them; and past five skipped rows the rest were only counted.
 *
 * Also the confirm's asks: a value AND a reason together (date + reason, optional reason), a date
 * below `min` is named instead of silently ignored, and a choice can be refused by `validate`.
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

const toastError = jest.fn();
jest.mock("@/lib/toast", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: jest.fn(), warning: jest.fn() },
  toastErrorAlreadyCaptured: () => undefined,
}));
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: async () => true }));
// The package DateField is a text field that commits on blur (0.86+); the contract this suite
// tests is "the value it reports reaches run", so a plain date input stands in for it here.
jest.mock("@ai-matrx/design-system/controls", () => {
  const actual = jest.requireActual("@ai-matrx/design-system/controls");
  const R = jest.requireActual("react");
  return {
    ...actual,
    DateField: ({ value, onValueChange, "aria-label": label }: { value: string | null; onValueChange: (v: string | null) => void; "aria-label"?: string }) =>
      R.createElement("input", { type: "date", "aria-label": label, value: value ?? "", onChange: (e: { target: { value: string } }) => onValueChange(e.target.value || null) }),
  };
});
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
const copyText = jest.fn(async () => true);
jest.mock("@ai-matrx/kit/clipboard", () => ({ copyText: (...a: unknown[]) => copyText(...(a as [])) }));

import { EntityBulkActions } from "../components/EntityBulkBar";
import { BulkNoneDoneError } from "../bulkSkipped";
import type { EntityBulkAction, EntityBulkSelection } from "../selection";

type Row = { id: string };
const target: EntityBulkSelection<Row> = {
  mode: "ids",
  ids: ["a", "b", "c"],
  rows: [{ id: "a" }, { id: "b" }, { id: "c" }],
  count: 3,
  filter: {} as EntityBulkSelection<Row>["filter"],
};

async function mount(action: EntityBulkAction<Row>, host: { setIds?: (ids: string[]) => void; clear?: () => void } = {}) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <EntityBulkActions
        actions={[action]}
        selection={{ build: () => target, clear: host.clear ?? jest.fn(), count: 3, ...(host.setIds ? { setIds: host.setIds } : {}) }}
        noun="row"
        onRemoveRows={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );
  });
}
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
async function click(element: Element | null | undefined) {
  if (!element) throw new Error("missing element");
  await act(async () => { (element as HTMLElement).click(); });
  await flush();
}
const buttons = (name: string) => [...document.querySelectorAll("button")].filter((b) => b.textContent?.trim() === name);
const confirmButton = () => buttons("Cancel")[0]?.nextElementSibling as HTMLButtonElement | null;
const press = (id: string) => click(document.querySelector(`[data-entity-bulk-action="${id}"]`));
async function typeInto(el: HTMLInputElement | HTMLTextAreaElement | null, value: string) {
  if (!el) throw new Error("no field");
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
const dateBox = () => document.querySelector<HTMLInputElement>('[data-entity-bulk-ask="date"] input[type="date"]');
const reasonBox = () => document.querySelector<HTMLTextAreaElement>("[data-entity-bulk-reason] textarea");

afterEach(() => {
  document.body.innerHTML = "";
  jest.clearAllMocks();
});

describe("a partial result", () => {
  it("keeps exactly the skipped rows ticked and does not clear", async () => {
    const setIds = jest.fn();
    const clear = jest.fn();
    await mount({ id: "go", label: "Go", run: async () => ({ message: "Done: 2 rows.", keepIds: ["c"] }) }, { setIds, clear });
    await press("go");
    expect(setIds).toHaveBeenCalledWith(["c"]);
    expect(clear).not.toHaveBeenCalled();
  });

  it("a host that cannot narrow keeps the WHOLE selection (a failed row's tick is never dropped)", async () => {
    const clear = jest.fn();
    await mount({ id: "go", label: "Go", run: async () => ({ keepIds: ["c"] }) }, { clear });
    await press("go");
    expect(clear).not.toHaveBeenCalled();
  });

  it("a full success still clears", async () => {
    const clear = jest.fn();
    await mount({ id: "go", label: "Go", run: async () => ({ message: "Done" }) }, { clear });
    await press("go");
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("nothing done with more than five skipped: the error toast offers Copy list of every row", async () => {
    const skipped = Array.from({ length: 7 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}`, reason: "Refused" }));
    await mount({ id: "go", label: "Go", run: async () => { throw new BulkNoneDoneError("None done. 7 rows skipped — … · +2 more", skipped); } });
    await press("go");
    const [message, options] = toastError.mock.calls[0] as [string, { action: { label: string; onClick: () => void } }];
    expect(message).toContain("+2 more");
    expect(options.action.label).toBe("Copy list");
    options.action.onClick();
    expect(copyText).toHaveBeenCalledWith(skipped.map((s) => `${s.name}: Refused`).join("\n"), expect.any(Object));
  });
});

describe("the confirm's asks", () => {
  it("a DATE and a reason in one dialog: both reach run", async () => {
    const run = jest.fn(async () => ({}));
    await mount({
      id: "temp",
      label: "Temporary",
      confirm: () => ({
        title: "Approve 3 rows until?",
        description: "Then Rejected.",
        ask: { kind: "date", label: "Expires on", defaultValue: "2030-01-08" },
        reason: { placeholder: "Note (recorded)" },
      }),
      run,
    });
    await press("temp");
    expect(dateBox()).not.toBeNull();
    expect(confirmButton()?.disabled).toBe(true);
    await typeInto(reasonBox(), " Quarter close ");
    await click(confirmButton());
    expect(run).toHaveBeenCalledWith(target, { value: "2030-01-08", reason: "Quarter close" });
  });

  it("an OPTIONAL reason beside a value: Confirm works empty and run gets an empty reason", async () => {
    const run = jest.fn(async () => ({}));
    await mount({
      id: "set",
      label: "Set level",
      confirm: () => ({
        title: "Set level?",
        description: "Each moves.",
        ask: { kind: "choice", label: "Level", options: [{ value: "a", label: "A" }] },
        reason: { placeholder: "Note", optional: true },
      }),
      run,
    });
    await press("set");
    expect(confirmButton()?.disabled).toBe(false);
    await click(confirmButton());
    expect(run).toHaveBeenCalledWith(target, { value: "a", reason: "" });
  });

  it("a date below min is NAMED and blocks Confirm (it used to be silently ignored)", async () => {
    const run = jest.fn(async () => ({}));
    await mount({
      id: "temp",
      label: "Temporary",
      confirm: () => ({ title: "Until?", description: "Then Rejected.", ask: { kind: "date", label: "Expires on", defaultValue: "2030-01-08", min: "2030-01-05" } }),
      run,
    });
    await press("temp");
    await typeInto(dateBox(), "2030-01-02");
    expect(document.body.textContent).toContain("Pick a later date");
    expect(confirmButton()?.disabled).toBe(true);
  });

  it("a choice the verb refuses (validate) blocks Confirm with its sentence", async () => {
    await mount({
      id: "role",
      label: "Set role",
      confirm: () => ({
        title: "Set role?",
        description: "Each member moves.",
        ask: { kind: "choice", label: "Role", options: [{ value: "owner", label: "Owner" }, { value: "member", label: "Member" }], validate: (v) => (v === "owner" ? "Transfer ownership instead" : null) },
      }),
      run: jest.fn(async () => ({})),
    });
    await press("role");
    expect(document.body.textContent).toContain("Transfer ownership instead");
    expect(confirmButton()?.disabled).toBe(true);
  });
});
