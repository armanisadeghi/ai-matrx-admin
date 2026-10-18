/**
 * A SCHEMA IS "ABSENT" ONLY WHEN MEASURED ABSENT (defect 2026-10-14).
 *
 * The kind-registry Preview of `brand_basics` said "This shape has no loaded
 * schema" on first load: it read `getSchema` before the per-kind cold fetch
 * landed, and nothing repainted it when the schema arrived. The registry now
 * answers a measured state — `pending` until the read settles — and every
 * settle (with or without a schema) bumps the kind so a screen repaints.
 */

const schemaReads = new Map<string, () => Promise<unknown>>();

jest.mock("@ai-matrx/rich-content/kinds/registry/schema-source-kind-tables", () => {
  const actual = jest.requireActual("@ai-matrx/rich-content/kinds/registry/schema-source-kind-tables");
  return {
    ...actual,
    listKindCatalogFromTables: jest.fn(async () => [
      { slug: "late_schema_kind", loadingComponent: null },
      { slug: "schemaless_kind", loadingComponent: null },
      { slug: "unreadable_kind", loadingComponent: null },
    ]),
    getKindSchemaAndMetaBySlugFromTables: jest.fn(async (kind: string) => {
      const read = schemaReads.get(kind);
      return read ? read() : null;
    }),
  };
});

jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({
  captureError: () => {},
}));

import { PackageKindRegistry } from "@ai-matrx/rich-content/kinds/registry/package-kind-registry";
import { kindRegistry } from "../kind-registry";

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

it("is pending until the cold read lands, then loaded — and the kind repaints", async () => {
  let release: (value: unknown) => void = () => {};
  schemaReads.set(
    "late_schema_kind",
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  expect(kindRegistry.schemaState("late_schema_kind")).toBe("pending");
  const before = kindRegistry.getKindVersion("late_schema_kind");
  kindRegistry.requestSchema("late_schema_kind");
  await flush();
  // In flight: never claimed absent.
  expect(kindRegistry.schemaState("late_schema_kind")).toBe("pending");
  release({
    schema: { kind: "late_schema_kind", fields: { name: { type: "string" } } },
    loadingComponent: null,
    emittedJsonSchema: null,
  });
  await flush();
  expect(kindRegistry.schemaState("late_schema_kind")).toBe("loaded");
  expect(kindRegistry.getKindVersion("late_schema_kind")).toBeGreaterThan(before);
});

it("is absent only after a read answered with no schema, and that settle repaints", async () => {
  schemaReads.set("schemaless_kind", async () => ({
    schema: null,
    loadingComponent: null,
    emittedJsonSchema: null,
  }));
  const before = kindRegistry.getKindVersion("schemaless_kind");
  kindRegistry.requestSchema("schemaless_kind");
  await flush();
  expect(kindRegistry.schemaState("schemaless_kind")).toBe("absent");
  expect(kindRegistry.getKindVersion("schemaless_kind")).toBeGreaterThan(before);
});

it("a read that throws is 'failed', never 'absent'", async () => {
  schemaReads.set("unreadable_kind", async () => {
    throw new Error("permission denied");
  });
  kindRegistry.requestSchema("unreadable_kind");
  await flush();
  expect(kindRegistry.schemaState("unreadable_kind")).toBe("failed");
});

// FIRST PAINT (2026-10-17): this app registers its kindDataClient through the LAZY rich-content host
// loader (providers/richContentHost). Until that loader settles there is no client YET — the screen
// must say "checking", never "no loaded schema". The state is planted the way the loader registers it.
// A COLD registry is used: once the catalog has landed, the catalog itself answers (next test).
function withLazyHost<T>(settled: boolean, run: () => T): T {
  const key = Symbol.for("ai-matrx.rich-content.host.loader");
  const g = globalThis as unknown as Record<symbol, unknown>;
  const clientKey = Symbol.for("ai-matrx.rich-content.host");
  const store = g[clientKey] as { host: Record<string, unknown> };
  const savedHost = store.host;
  const savedLoader = g[key];
  store.host = {};
  g[key] = { load: settled ? async () => {} : () => new Promise(() => {}), promise: null, settled };
  try {
    return run();
  } finally {
    store.host = savedHost;
    g[key] = savedLoader;
  }
}

it("is pending, never absent, while the lazy host has not landed (catalog not yet landed)", () => {
  const cold = new PackageKindRegistry();
  withLazyHost(false, () => expect(cold.schemaState("never_asked_kind")).toBe("pending"));
  withLazyHost(true, () => expect(cold.schemaState("never_asked_kind")).toBe("absent"));
});

// THE KIND'S OWN "NONE" SETTLES (rich-content ffae619b96, 2026-10-17; published in 0.2.207): once the
// catalog (every slug the platform knows) has landed and a kind is not in it, that IS the definition's
// answer — `requestSchema` never reads a kind the catalog does not name — so a nested kind nobody
// rendered on its own is "absent", not "pending" for ever, even while the lazy host has not landed.
// (The first tests in this file warmed the shared registry's catalog with three slugs.)
it("a kind the landed catalog does not name is absent even before the lazy host lands — never waits forever", () => {
  withLazyHost(false, () => expect(kindRegistry.schemaState("never_asked_kind")).toBe("absent"));
});
