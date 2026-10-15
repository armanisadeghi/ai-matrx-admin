/** @jest-environment jsdom */
//
// The home picker opened from a sidebar row: type a name, press Enter, the note
// moves to the home that was typed. Red before: the item's search value was
// "<name> <organization> <kind> <scope id>", and cmdk's fuzzy scorer over that
// long string ranked "General · Compass Route Relocation Advisors" above
// "Prompts/Agents" for the text "Prompts" (its letters appear, scattered, across
// the organization name and the id) — so Enter moved the note somewhere else
// (live, 2026-10-11: 1 try of 3 landed).

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView ??= () => {};

jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn(), useAppSelector: () => undefined }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/features/scopes/redux/thunks/scopeTreeMutations", () => ({ createScope: jest.fn() }));

const home = (scopeId: string, name: string, organizationName: string, scopeTypeLabel: string, isGeneral = false) => ({
  scopeId, name, organizationName, scopeTypeLabel, isGeneral, organizationId: `org-${organizationName}`, scopeTypeId: scopeTypeLabel,
});
const HOMES = [
  home("0a1b2c3d-0000-4000-8000-000000000001", "General", "Compass Route Relocation Advisors", "General", true),
  home("9f8e7d6c-0000-4000-8000-000000000002", "Prompts/Agents", "admin's Workspace", "Project"),
  home("5c4b3a29-0000-4000-8000-000000000003", "Port of Oakland lane", "Compass Route Relocation Advisors", "Lane"),
  home("1d2e3f40-0000-4000-8000-000000000004", "General", "admin's Workspace", "General", true),
];
jest.mock("../useHomeChoices", () => ({
  useHomeChoices: () => ({ homes: HOMES, organizations: [], status: "ready" }),
}));

import { HomePickerList } from "../HomePickerList";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function typeIntoFilter(text: string) {
  const input = container.querySelector("input") as HTMLInputElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => undefined);
  return input;
}

async function pressEnter(input: HTMLInputElement) {
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  });
}

describe("home picker: type to filter, Enter moves", () => {
  it.each(["Prompts", "prompts/a", "Oakland"])("Enter after typing %p picks the home named that", async (text) => {
    const onPick = jest.fn();
    await act(async () => {
      root.render(
        <HomePickerList currentScopeId={HOMES[3].scopeId} initialOrganizationId="org-x" onPick={onPick} />,
      );
    });
    const input = await typeIntoFilter(text);
    const highlighted = container.querySelector('[cmdk-item][aria-selected="true"]') as HTMLElement;
    const expected = text.toLowerCase().startsWith("prompts") ? HOMES[1] : HOMES[2];
    expect(highlighted?.getAttribute("data-home-scope-id")).toBe(expected.scopeId);
    await pressEnter(input);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0].scopeId).toBe(expected.scopeId);
  });

  it("typing a home's own name never highlights the home the note is already in", async () => {
    const onPick = jest.fn();
    await act(async () => {
      root.render(<HomePickerList currentScopeId={HOMES[3].scopeId} initialOrganizationId="org-x" onPick={onPick} />);
    });
    const input = await typeIntoFilter("General");
    await pressEnter(input);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0].scopeId).toBe(HOMES[0].scopeId);
  });
});
