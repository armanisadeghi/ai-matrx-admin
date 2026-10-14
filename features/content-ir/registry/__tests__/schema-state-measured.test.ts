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

jest.mock("../schema-source-kind-tables", () => {
  const actual = jest.requireActual("../schema-source-kind-tables");
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
