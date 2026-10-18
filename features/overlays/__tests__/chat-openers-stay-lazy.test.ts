/**
 * Chat's window openers stay off first load (FEATURE.md rule 8): the chat host mount and the
 * lazy spec list never import an opener module statically — the opener code is ONE chunk,
 * `chat-window-openers.ts`, reached only through the spec list's single `import()`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function staticImports(source: string): string[] {
  return [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+"([^"]+)";/gms)].map((m) => m[1]);
}

describe("chat window openers load on first open", () => {
  it("ChatHostAdapter imports no overlay opener or definition module", () => {
    const offenders = staticImports(read("providers/ChatHostAdapter.tsx")).filter((spec) =>
      spec.startsWith("@/features/overlays/definitions/"),
    );
    expect(offenders).toEqual([]);
  });

  it("the spec list imports only the per-subject id helpers, and reaches the chunk by one import()", () => {
    const source = read("features/overlays/chat-window-opener-specs.ts");
    const fromDefinitions = staticImports(source).filter((spec) => spec.startsWith("./definitions/"));
    expect(fromDefinitions).toEqual(["./definitions/opener-instance-ids"]);
    expect(source.match(/import\(/g)).toHaveLength(1);
    expect(source).toContain('import("./chat-window-openers")');
  });

  it("the guard can fail: the chunk itself imports opener modules statically", () => {
    const chunk = staticImports(read("features/overlays/chat-window-openers.ts"));
    expect(chunk.filter((spec) => spec.startsWith("./definitions/")).length).toBeGreaterThan(10);
  });
});
