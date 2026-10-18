/**
 * ONE REASON FOR THE WHOLE SELECTION (users one roof, lane L, 2026-10-18).
 *
 * An audited bulk verb (close, reopen) used to record a canned sentence for every row because the
 * shared confirm could not take an input. `EntityBulkActionConfirm.reason` turns the confirm into a
 * text dialog; the typed words reach `run` as `input.reason`, once, for every row.
 *
 * RED against the pre-change shell: without `reason` handling the confirm is a plain yes/no and
 * `run` receives no second argument — "the typed reason reaches run" fails.
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
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({
  confirm: jest.fn(async () => true),
}));
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
        noun="account"
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
const reasonBox = () => document.querySelector<HTMLInputElement | HTMLTextAreaElement>('[placeholder="Reason"]');
async function click(element: Element | undefined) {
  if (!element) throw new Error("missing element");
  await act(async () => { (element as HTMLElement).click(); });
  await flush();
}
async function type(value: string) {
  const box = reasonBox();
  if (!box) throw new Error("no reason box");
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(box), "value")!.set!;
  await act(async () => {
    setter.call(box, value);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

afterEach(() => { document.body.innerHTML = ""; });

describe("bulk confirm asks one reason", () => {
  it("the typed reason reaches run, once, for the whole selection", async () => {
    const run = jest.fn(async () => ({}));
    await mount({
      id: "close",
      label: "Close",
      confirm: (sel) => ({
        title: `Close ${sel.count} accounts?`,
        description: "They can't sign in again.",
        reason: { placeholder: "Reason" },
      }),
      run,
    });
    await click(document.querySelector('[data-entity-bulk-action="close"]') ?? undefined);
    expect(reasonBox()).not.toBeNull();
    await type("  spam signups  ");
    // The dialog's confirm sits beside its Cancel (the X close also reads "Close").
    await click(buttons("Cancel")[0]?.nextElementSibling ?? undefined);
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(target, { reason: "spam signups" });
  });

  it("cancelling the reason runs nothing", async () => {
    const run = jest.fn(async () => ({}));
    await mount({
      id: "reopen",
      label: "Reopen",
      confirm: () => ({ title: "Reopen?", description: "They can sign in.", reason: { placeholder: "Reason" } }),
      run,
    });
    await click(document.querySelector('[data-entity-bulk-action="reopen"]') ?? undefined);
    expect(reasonBox()).not.toBeNull();
    await click(buttons("Cancel")[0]);
    await flush();
    expect(reasonBox()).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });
});
