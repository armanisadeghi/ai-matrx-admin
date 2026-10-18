/** @jest-environment jsdom */
//
// The "All levels" panel must not wait for the full people roster (seconds). Live walk 2026-10-18:
// the panel sat on "Reading every override…" ~7 s because rows were held back for the roster.
//
// (Arman 2026-09-26: defaults for everyone, then per-org and per-user
// overrides). These cases are what an operator does with it: read who differs
// from the default (by NAME, never an id), read what one person actually gets
// and which layer decided it, add an override, and remove one — and each write
// must go through the door the KEY declares, with a removal being that door
// with a null value (never a direct table delete).
//
// Only the module boundaries are mocked: the override list read, the knob_index
// resolution, the door lookup + door write, and the admin roster fetch.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ScopedKnob } from "@/lib/scoped-config/types";
import type { KnobWriteDoor, PlatformKnobOverrideRow } from "@/lib/scoped-config/service";

jest.mock("@/lib/scoped-config/service", () => ({
  ...jest.requireActual("@/lib/scoped-config/service"),
  fetchPlatformKnobOverrides: jest.fn(),
  fetchKnobDefinition: jest.fn(),
  fetchKnobWriteDoor: jest.fn(),
  writeKnobOverrideThroughDoor: jest.fn(),
}));
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: jest.fn(async () => true) }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

import {
  fetchKnobDefinition,
  fetchKnobWriteDoor,
  fetchPlatformKnobOverrides,
  writeKnobOverrideThroughDoor,
} from "@/lib/scoped-config/service";
import { toast } from "@/lib/toast";
import { fetchPlatformKnobOverrides } from "@/lib/scoped-config/service";
import { KnobOverridesAdmin } from "../components/KnobOverridesAdmin";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const ORG = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const PERSON = "87a6e699-3622-4869-8843-d0867456c0dd";

const knob = {
  feature: "data_tables", key: "merged_grid", full_key: "data_tables.merged_grid", label: "Grid", description: "",
  value_type: "boolean", unit: null, allowed_values: null, overridable_by: ["organization", "user"], platform_default: false,
  ui: {},
} as unknown as ScopedKnob;

describe("the opened key does not wait for the people roster", () => {
  it("shows the override rows, organizations named, while the roster is still loading", async () => {
    (fetchPlatformKnobOverrides as jest.Mock).mockResolvedValue([
      { scope_kind: "organization", scope_id: ORG, organization_id: ORG, value: true, updated_at: "2026-09-28T18:00:00Z", updated_by: PERSON, set_note: null },
      { scope_kind: "user", scope_id: PERSON, organization_id: ORG, value: true, updated_at: "2026-09-28T19:00:00Z", updated_by: PERSON, set_note: null },
    ]);
    global.fetch = jest.fn((url: string) =>
      url.includes("/organizations")
        ? Promise.resolve({ ok: true, json: async () => ({ directory: { organizations: [{ id: ORG, name: "Acme Plumbing", slug: "acme" }] } }) })
        : new Promise(() => {}),
    ) as unknown as typeof fetch;
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<KnobOverridesAdmin knob={knob} onChanged={jest.fn()} />);
    });
    await act(async () => {
      await new Promise((settle) => setTimeout(settle, 0));
    });
    const text = container.textContent ?? "";
    expect(text).not.toContain("Reading every override");
    expect(text).toContain("2 overrides (1 organization, 1 person)");
    expect(text).toContain("Acme Plumbing");
    expect(text).toContain("Loading name…");
    expect(text).not.toContain("no longer on the roster");
    act(() => root.unmount());
    container.remove();
  });
});
