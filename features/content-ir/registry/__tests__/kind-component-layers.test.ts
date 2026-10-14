/**
 * SHAPE LAYERS — the frontend overlay ADAPTER (slice 2), forcing functions.
 * The lifecycle itself is tested in `@ai-matrx/content-ir-react`
 * (`__tests__/overlay-loader.test.ts`); here:
 *
 *  1. The chunk read carries the package's explicit audience predicate and
 *     `deleted_at IS NULL` — on an admin-lane page too.
 *  2. A long organization list is chunked and every chunk still names the viewer.
 *  3. Organizations come from the app's loaded scope tree (no second
 *     membership read) when it is ready.
 *  4. A membership change after the read forces a re-read; an unchanged list does not.
 */

interface Recorded {
  table: string;
  filters: Array<[string, ...unknown[]]>;
}
const recorded: Recorded[] = [];
let tableRows: unknown[] = [];

jest.mock("@/utils/supabase/client", () => {
  function builder(table: string) {
    const entry: Recorded = { table, filters: [] };
    recorded.push(entry);
    const chain: Record<string, unknown> = {};
    for (const op of ["select", "is", "or", "eq", "in", "order"]) {
      chain[op] = (...args: unknown[]) => {
        entry.filters.push([op, ...args]);
        return chain;
      };
    }
    chain.range = async () => ({ data: tableRows, error: null, count: tableRows.length });
    return chain;
  }
  return {
    supabase: {
      schema: (schema: string) => ({
        from: (table: string) => builder(`${schema}.${table}`),
      }),
    },
  };
});

import {
  readViewerLayerRows,
  readViewerOrganizationIds,
  resetOverlayAdapterForTests,
  watchViewerMembership,
} from "../kind-component-layers";
import { setStoreSingleton } from "@/lib/redux/store-singleton";

const ME = "11111111-1111-4111-8111-111111111111";
const ORG = "33333333-3333-4333-8333-333333333333";

describe("the overlay read declares its own scope", () => {
  beforeEach(() => {
    recorded.length = 0;
    tableRows = [];
  });

  it("every read carries the explicit predicate and deleted_at IS NULL", async () => {
    await readViewerLayerRows(ME, [ORG]);
    expect(recorded).toHaveLength(1);
    const [read] = recorded;
    expect(read.table).toBe("content_ir.kind_component_layer");
    expect(read.filters).toContainEqual(["is", "deleted_at", null]);
    expect(read.filters).toContainEqual([
      "or",
      `audience_user_id.eq.${ME},audience_organization_id.in.(${ORG})`,
    ]);
  });

  it("chunks a long organization list — every chunk still names the viewer", async () => {
    const orgs = Array.from({ length: 150 }, (_, i) => `org-${i}`);
    await readViewerLayerRows(ME, orgs);
    expect(recorded).toHaveLength(2);
    for (const read of recorded) {
      const or = read.filters.find(([op]) => op === "or");
      expect(String(or?.[1])).toMatch(new RegExp(`^audience_user_id\\.eq\\.${ME},`));
    }
  });
});

describe("organizations come from the app's own loaded list", () => {
  function fakeStore(initial: { treeStatus: string; organizationIds: string[] }) {
    let state = { scopesTree: initial };
    const listeners = new Set<() => void>();
    setStoreSingleton({
      getState: () => state,
      subscribe: (l: () => void) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
    } as never);
    return {
      set(next: { treeStatus: string; organizationIds: string[] }) {
        state = { scopesTree: next };
        listeners.forEach((l) => l());
      },
    };
  }

  beforeEach(() => {
    resetOverlayAdapterForTests();
    recorded.length = 0;
  });

  it("a ready scope tree answers with no membership read", async () => {
    fakeStore({ treeStatus: "ready", organizationIds: ["b", "a"] });
    expect(await readViewerOrganizationIds()).toEqual(["a", "b"]);
    expect(recorded).toHaveLength(0);
  });

  it("a membership change after the read forces a re-read; an unchanged list does not", async () => {
    const store = fakeStore({ treeStatus: "ready", organizationIds: ["a", "b"] });
    await readViewerOrganizationIds();
    const onChange = jest.fn();
    watchViewerMembership(onChange);
    store.set({ treeStatus: "ready", organizationIds: ["b", "a"] });
    expect(onChange).not.toHaveBeenCalled();
    store.set({ treeStatus: "ready", organizationIds: ["a"] }); // left org b
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
