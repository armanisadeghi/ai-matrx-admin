/**
 * 2026-10-16 21:45Z: one table held by a lock (DDL in flight) stalled `container_resource_counts`
 * into the 8 s statement timeout (57014) and every tile on the organization page lost its count.
 * The function now answers `n: null` for a busy table and counts the rest. The hook must read that
 * null as "not counted" — named in `failures`, the tile null — never `Number(null)` = 0.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ORG = "7a2e3d4c-5b6a-4968-8776-655443322119";

const client = {
  rpc: async () => ({
    data: [
      { resource_key: "note", n: null },
      { resource_key: "agent", n: 4 },
    ],
    error: null,
  }),
  schema: () => ({
    from: () => {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "neq"]) b[m] = () => b;
      b.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
      return b;
    },
    rpc: async () => ({ data: [], error: null }),
  }),
};
jest.mock("@/utils/supabase/client", () => ({ supabase: client, createClient: () => client }));
jest.mock("@/features/scopes/service/kindInventory", () => ({ fetchKindCounts: async () => new Map() }));
jest.mock("@/features/data-tables/pick-lists/where-lists-live", () => ({ organizationPickListsInTheNewSystem: async () => [] }));
jest.mock("@/features/resource-manager/source-input/savedWebPages", () => ({ countSavedSources: async () => 0 }));

import { useContainerInventory } from "../useContainerInventory";
import { ORG_RESOURCE_CATALOGUE } from "../../resource-catalogue";
import { storeReadsWrapper } from "@/test-utils/store-reads";

it("a table the count could not read is named, never shown as 0", async () => {
  let counts: Record<string, number | null> = {};
  let failures: string[] = [];
  function Probe() {
    const inventory = useContainerInventory({ column: "organization_id", value: ORG });
    counts = inventory.counts;
    failures = inventory.failures;
    return null;
  }
  const root = createRoot(document.createElement("div"));
  const Store = storeReadsWrapper();
  await act(async () => {
    root.render(
      <Store>
        <Probe />
      </Store>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  const note = ORG_RESOURCE_CATALOGUE.find((e) => e.key === "note");
  expect(note).toBeDefined();
  expect(counts.note ?? null).not.toBe(0);
  expect(failures).toContain(note?.labelPlural.toLowerCase());
  expect(counts.agent).toBe(4);
  root.unmount();
});
