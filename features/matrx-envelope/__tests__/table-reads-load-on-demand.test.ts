/**
 * `referenceResolvers` is on every page's first load (chatContextSources → referenceCell → here).
 * On 2026-10-13 its static import of `@/features/data-tables/service` dragged the record store and
 * records-ui onto every page (lane S8). Every table read is async, so the service now loads inside
 * the resolver the first time one runs.
 *
 * Fails when the data-tables service is imported statically again.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function valueImports(src: string): string[] {
  return [...src.matchAll(/^import\s+(?!type\b)(?:[^;]*?\s+from\s+)?["']([^"']+)["']/gm)].map((m) => m[1]!);
}

describe("reference resolvers load the table reads on demand", () => {
  it("no static import of the data-tables service", () => {
    const src = readFileSync(join(__dirname, "..", "referenceResolvers.ts"), "utf8");
    expect(valueImports(src)).not.toContain("@/features/data-tables/service");
    expect(src).toContain('import("@/features/data-tables/service")');
  });

  it("a plant is caught", () => {
    expect(valueImports('import {\n  getTableMetadata,\n} from "@/features/data-tables/service";')).toContain(
      "@/features/data-tables/service",
    );
  });
});
