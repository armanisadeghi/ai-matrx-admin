/**
 * SHAPE LAYERS — the frontend overlay loader (slice 2), forcing functions.
 *
 *  1. The read declares its own scope: `audience_user_id = me OR
 *     audience_organization_id IN my orgs`, deleted_at IS NULL — on an
 *     admin-lane page too (RLS's platform_admin_read arm would otherwise hand
 *     an admin every person's rows).
 *  2. Signed out → no read at all, and no overlay.
 *  3. A viewer switch clears the overlay BEFORE the next viewer's read, and a
 *     read that lands after the viewer changed is discarded — never installed
 *     for the wrong person.
 *  4. An admin-lane change re-reads (and clears first).
 *  5. Through the REAL resolver: a user row renders for its audience only.
 */

import { ComponentResolver } from "@ai-matrx/content-ir-react";
import type {
  ComponentOverlayInput,
  KindComponentLayerRow,
} from "@ai-matrx/content-ir-react";

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
  KindComponentOverlayLoader,
  layerAudienceFilter,
  readViewerLayerRows,
  type OverlayLoaderPorts,
  type OverlayTarget,
  type OverlayViewer,
} from "../kind-component-layers";

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ORG = "33333333-3333-4333-8333-333333333333";

function layerRow(overrides: Partial<KindComponentLayerRow> & { id: string }): KindComponentLayerRow {
  return {
    kind: "brand_intake_facts",
    platform: "web",
    role: "output",
    componentKey: "layered",
    source: "db",
    config: {},
    isActive: true,
    componentSource: "body",
    propsTransform: null,
    pinnedKindVersion: null,
    updatedAt: "2026-10-14T00:00:00Z",
    createdBy: null,
    audienceUserId: null,
    audienceOrganizationId: null,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function fakeTarget() {
  const calls: Array<["set", ComponentOverlayInput] | ["clear"]> = [];
  const target: OverlayTarget = {
    setOverlay: (input) => calls.push(["set", input]),
    clearOverlay: () => calls.push(["clear"]),
  };
  return { target, calls };
}

describe("the overlay read declares its own scope", () => {
  beforeEach(() => {
    recorded.length = 0;
    tableRows = [];
  });

  it("names the viewer and only the viewer's organizations", () => {
    expect(layerAudienceFilter(ME, [])).toBe(`audience_user_id.eq.${ME}`);
    expect(layerAudienceFilter(ME, [ORG])).toBe(
      `audience_user_id.eq.${ME},audience_organization_id.in.(${ORG})`,
    );
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

describe("KindComponentOverlayLoader lifecycle", () => {
  function setup(initial: OverlayViewer) {
    let viewer = initial;
    const reads: Array<{ userId: string; done: ReturnType<typeof deferred<KindComponentLayerRow[]>> }> = [];
    const errors: string[] = [];
    const ports: OverlayLoaderPorts = {
      viewer: () => viewer,
      readOrganizationIds: async () => [ORG],
      readRows: (userId) => {
        const done = deferred<KindComponentLayerRow[]>();
        reads.push({ userId, done });
        return done.promise;
      },
      reportError: (message) => errors.push(message),
    };
    const { target, calls } = fakeTarget();
    const loader = new KindComponentOverlayLoader(target, ports);
    return {
      loader,
      calls,
      reads,
      errors,
      setViewer: (next: OverlayViewer) => {
        viewer = next;
      },
    };
  }

  it("signed out: no read and no overlay", async () => {
    const { loader, calls, reads } = setup({ userId: null, laneOpen: false });
    await loader.sync();
    expect(reads).toHaveLength(0);
    expect(calls).toEqual([["clear"]]);
  });

  it("installs the viewer's rows once, and an unchanged viewer re-reads nothing", async () => {
    const { loader, calls, reads } = setup({ userId: ME, laneOpen: false });
    const first = loader.sync();
    await flush();
    reads[0].done.resolve([layerRow({ id: "m", audienceUserId: ME })]);
    await first;
    expect(calls.at(-1)?.[0]).toBe("set");
    await loader.sync();
    expect(reads).toHaveLength(1);
  });

  it("a viewer switch clears first; a late read for the old viewer is discarded", async () => {
    const { loader, calls, reads, setViewer } = setup({ userId: ME, laneOpen: false });
    const mine = loader.sync();
    // Before ME's read lands, OTHER signs in on this tab.
    setViewer({ userId: OTHER, laneOpen: false });
    const theirs = loader.sync();
    expect(calls.filter(([op]) => op === "clear").length).toBeGreaterThanOrEqual(1);
    // await a microtask so both reads have been issued
    await flush();
    reads[0].done.resolve([layerRow({ id: "m", audienceUserId: ME })]);
    await mine;
    expect(calls.some(([op, input]) => op === "set" && input?.viewerId === ME)).toBe(false);
    reads[1].done.resolve([]);
    await theirs;
    const sets = calls.filter(([op]) => op === "set") as Array<["set", ComponentOverlayInput]>;
    expect(sets.map(([, input]) => input.viewerId)).toEqual([OTHER]);
  });

  it("an admin-lane change clears and re-reads", async () => {
    const { loader, calls, reads, setViewer } = setup({ userId: ME, laneOpen: false });
    const first = loader.sync();
    await flush();
    reads[0].done.resolve([]);
    await first;
    const before = calls.length;
    setViewer({ userId: ME, laneOpen: true });
    const second = loader.sync();
    expect(calls[before]).toEqual(["clear"]);
    await flush();
    expect(reads).toHaveLength(2);
    reads[1].done.resolve([]);
    await second;
  });

  it("a failed read is loud and leaves the shared tiers answering", async () => {
    const { loader, errors } = setup({ userId: ME, laneOpen: false });
    const failing = new KindComponentOverlayLoader(fakeTarget().target, {
      viewer: () => ({ userId: ME, laneOpen: false }),
      readOrganizationIds: async () => {
        throw new Error("refused");
      },
      readRows: async () => [],
      reportError: (message) => errors.push(message),
    });
    void loader;
    await failing.sync();
    expect(errors.join("\n")).toMatch(/could not be read/);
  });
});

describe("through the real resolver — no cross-user render", () => {
  it("a user row renders for its audience and never for another viewer", async () => {
    const resolver = new ComponentResolver({ reportError: () => {} });
    resolver.ingestDbRows([
      {
        kind: "brand_intake_facts",
        platform: "web",
        role: "output",
        componentKey: "shared",
        source: "bundled",
        config: {},
        isActive: true,
        componentSource: null,
        propsTransform: null,
        pinnedKindVersion: null,
        updatedAt: null,
        createdBy: null,
      },
    ]);
    let viewer: OverlayViewer = { userId: ME, laneOpen: false };
    const mine = layerRow({ id: "mine", audienceUserId: ME, componentKey: "mine" });
    const loader = new KindComponentOverlayLoader(resolver, {
      viewer: () => viewer,
      readOrganizationIds: async () => [],
      // A read that (wrongly) returns ME's row to everyone — the resolver's
      // own audience check must still hold.
      readRows: async () => [mine],
      reportError: () => {},
    });
    await loader.sync();
    expect(resolver.resolve("brand_intake_facts", "web", "output")?.componentKey).toBe("mine");
    viewer = { userId: OTHER, laneOpen: false };
    await loader.sync();
    expect(resolver.resolve("brand_intake_facts", "web", "output")?.componentKey).toBe("shared");
    viewer = { userId: null, laneOpen: false };
    await loader.sync();
    expect(resolver.getOverlayViewer()).toBeNull();
  });
});
