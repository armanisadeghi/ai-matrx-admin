// The chat lazy-slot implementation module (chatUiRegistrationImpl.ts) evaluates for EVERY lazy
// chat slot, so whatever it reaches by STATIC imports loads on /chat/new before anyone engages.
// A heavy module (one that fires a `load:heavy:*` marker) must sit behind its own import().
// Regression: NoteEditorCore was imported statically here and fired "Notes editor" on /chat/new.
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = join(__dirname, "..", "..");
const ENTRY = "providers/chatUiRegistrationImpl.ts";
const HEAVY_MARKER = /performance\.mark\(\s*["'`]load:heavy:/;
// Package modules that fire a heavy marker when evaluated (the canvas column).
const HEAVY_PACKAGES = /^@ai-matrx\/canvas(\/react)?$/;
const EXTS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveSpec(spec: string, from: string): string | null {
  const base = spec.startsWith("@/") ? join(ROOT, spec.slice(2)) : spec.startsWith(".") ? join(dirname(join(ROOT, from)), spec) : null;
  if (!base) return null;
  for (const e of EXTS) {
    const p = base + e;
    if (existsSync(p) && /\.(ts|tsx)$/.test(p) && !p.endsWith(".d.ts")) return p.slice(ROOT.length + 1);
  }
  return null;
}

/** Static value imports/re-exports only: `import type`, `export type` and `import()` are skipped. */
function staticImports(src: string): string[] {
  const out: string[] = [];
  const re = /^\s*(?:import|export)\s+(?!type\b)(?:[^"'`;]*?\sfrom\s+)?["']([^"']+)["']/gm;
  for (let m = re.exec(src); m; m = re.exec(src)) out.push(m[1]);
  return out;
}

function heavyChains(): string[][] {
  const seen = new Map<string, string[]>([[ENTRY, [ENTRY]]]);
  const queue = [ENTRY];
  const hits: string[][] = [];
  while (queue.length) {
    const file = queue.shift()!;
    const src = readFileSync(join(ROOT, file), "utf8");
    if (file !== ENTRY && HEAVY_MARKER.test(src)) hits.push(seen.get(file)!);
    for (const spec of staticImports(src)) {
      if (HEAVY_PACKAGES.test(spec)) hits.push([...seen.get(file)!, spec]);
      const next = resolveSpec(spec, file);
      if (next && !seen.has(next)) {
        seen.set(next, [...seen.get(file)!, next]);
        queue.push(next);
      }
    }
  }
  return hits;
}

describe("chatUiRegistrationImpl static graph", () => {
  it("reaches no module that fires a load:heavy marker", () => {
    expect(heavyChains().map((c) => c.join(" -> "))).toEqual([]);
  });

  it("the scan itself sees heavy modules (planted: it must flag NoteEditorCore when imported statically)", () => {
    const src = 'import { NoteEditorCore } from "@/features/notes/components/NoteEditorCore";\nimport type { X } from "@/a";\nconst y = import("@/b");';
    expect(staticImports(src)).toEqual(["@/features/notes/components/NoteEditorCore"]);
    expect(HEAVY_MARKER.test(readFileSync(join(ROOT, "features/notes/components/NoteEditorCore.tsx"), "utf8"))).toBe(true);
  });
});
