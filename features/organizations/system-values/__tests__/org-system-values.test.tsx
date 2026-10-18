/**
 * An organization sets its own value for a System context item (lane L3b). Guards the wiring:
 * reads list only the curated items with the platform value and the organization's own; a save
 * and a reset reach the ONE value door with `organization_id` and no `scope_id`; an owner/admin
 * sees the editor, anyone else sees the values read-only; a door refusal is shown, not dropped.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const doorCall = jest.fn();
jest.mock("@ai-matrx/records/door-call", () => ({ lightDoorCall: () => doorCall }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import { loadOrgSystemValues, saveOrgSystemValue, clearOrgSystemValue } from "../orgSystemValues";
import { OrgSystemValuesSection } from "../OrgSystemValuesSection";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ORG = "226be635-194d-42dd-87c8-7a9562f70939";
const ITEM = "11b7b942-d604-4d7a-9566-571865f121ed";

function fakeClient(rows: Record<string, Record<string, unknown>[]>, seen: string[] = []) {
  return {
    schema: (s: string) => ({
      from: (t: string) => ({
        select: () => {
          const q: any = {
            eq: (c: string, v: unknown) => (seen.push(`${s}.${t}.${c}=${String(v)}`), q),
            is: (c: string) => (seen.push(`${s}.${t}.${c}=null`), q),
            order: () => q,
            then: (res: (v: unknown) => unknown) => res({ data: rows[t] ?? [], error: null }),
          };
          return q;
        },
      }),
    }),
  };
}
const ROWS = {
  system_context_item: [
    { id: ITEM, key: "company_name", display_name: "Company Name", value_type: "string", value: "AI Matrx" },
  ],
  system_context_item_org_value: [{ system_context_item_id: ITEM, value: "Tidewater Compass Movers" }],
};

beforeEach(() => doorCall.mockReset());

test("lists curated items with the platform value and the organization's own", async () => {
  const seen: string[] = [];
  const rows = await loadOrgSystemValues(fakeClient(ROWS, seen), ORG);
  expect(rows).toEqual([
    { itemId: ITEM, key: "company_name", displayName: "Company Name", valueType: "string", defaultValue: "AI Matrx", orgValue: "Tidewater Compass Movers" },
  ]);
  expect(seen).toContain("context.system_context_item.item_class=curated");
  expect(seen).toContain(`context.system_context_item_org_value.organization_id=${ORG}`);
});

test("a save and a reset reach the value door with the organization and no scope", async () => {
  doorCall.mockResolvedValue({ ok: true, data: { ok: true } });
  await saveOrgSystemValue({}, { organizationId: ORG, itemId: ITEM, value: "Tidewater" });
  await clearOrgSystemValue({}, { organizationId: ORG, itemId: ITEM });
  const [save, clear] = doorCall.mock.calls.map((c) => c[1].p_payload);
  expect(doorCall.mock.calls[0][0]).toBe("context_value_write");
  expect(save).toMatchObject({ context_item_id: ITEM, organization_id: ORG, value: "Tidewater" });
  expect(clear).toMatchObject({ context_item_id: ITEM, organization_id: ORG, clear: true });
  expect(save).not.toHaveProperty("scope_id");
  expect(clear).not.toHaveProperty("scope_id");
});

test("a door refusal comes back as a refusal", async () => {
  doorCall.mockResolvedValue({ ok: true, data: { ok: false, error: { code: "forbidden", message: "Only an owner or admin" } } });
  expect(await saveOrgSystemValue({}, { organizationId: ORG, itemId: ITEM, value: "x" })).toEqual({
    ok: false, code: "forbidden", message: "Only an owner or admin",
  });
});

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function mount(canEdit: boolean, client: unknown) {
  await act(async () => {
    root.render(<OrgSystemValuesSection organizationId={ORG} canEdit={canEdit} client={client} />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

test("owner/admin: shows both values, saves an edit, resets", async () => {
  doorCall.mockResolvedValue({ ok: true, data: { ok: true } });
  await mount(true, fakeClient(ROWS));
  expect(host.textContent).toContain("Company Name");
  expect(host.textContent).toContain("AI Matrx");
  const input = host.querySelector("input") as HTMLInputElement;
  expect(input.value).toBe("Tidewater Compass Movers");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, "Harbor Movers");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    (host.querySelector('button[aria-label="Save Company Name"]') as HTMLButtonElement).click();
  });
  expect(doorCall.mock.calls[0][1].p_payload).toMatchObject({ organization_id: ORG, value: "Harbor Movers" });
  await act(async () => {
    (host.querySelector('button[aria-label="Reset Company Name"]') as HTMLButtonElement).click();
  });
  expect(doorCall.mock.calls[1][1].p_payload).toMatchObject({ organization_id: ORG, clear: true });
});

test("a member sees the values read-only", async () => {
  await mount(false, fakeClient(ROWS));
  expect(host.textContent).toContain("Tidewater Compass Movers");
  expect(host.querySelector("input")).toBeNull();
  expect(host.querySelector('button[aria-label="Save Company Name"]')).toBeNull();
});
