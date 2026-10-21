/**
 * AnswerTextView has ONE home: @ai-matrx/chat window-panels/windows/text-review/AnswerTextView (the
 * body the text-review window and Matrx 2 draw). The web's answer views import it from there; a
 * web-side copy (a file named AnswerTextView, or any web module defining a component of that name)
 * fails here.
 *
 * Red before: components/official/structured-value/AnswerTextView.tsx was the web's own copy.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..", "..");
const DIRS = ["app", "components", "features", "lib", "providers", "hooks", "utils"];
const PACKAGE_PATH = "@ai-matrx/chat/window-panels/windows/text-review/AnswerTextView";

function* sources(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sources(path);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) yield path;
  }
}

describe("AnswerTextView lives only in the chat package", () => {
  const files = DIRS.flatMap((d) => [...sources(join(ROOT, d))]);

  it("no web file is named AnswerTextView or defines it", () => {
    const offenders = files.filter((f) => {
      if (/(^|\/)AnswerTextView\.(ts|tsx)$/.test(f)) return true;
      return /(export\s+)?(function|const)\s+AnswerTextView\b/.test(readFileSync(f, "utf8"));
    });
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it("every web importer reaches it through the package path", () => {
    const importers = files.filter((f) => /\bAnswerTextView\b/.test(readFileSync(f, "utf8")));
    expect(importers.length).toBeGreaterThan(0);
    for (const f of importers) {
      const src = readFileSync(f, "utf8");
      const specs = [...src.matchAll(/import\s*\{[^}]*\bAnswerTextView\b[^}]*\}\s*from\s*"([^"]+)"/g)].map((m) => m[1]);
      for (const spec of specs) expect(`${relative(ROOT, f)} -> ${spec}`).toBe(`${relative(ROOT, f)} -> ${PACKAGE_PATH}`);
    }
  });
});

describe("useMandateDisplayName lives only in the chat package (mandates/useMandateDisplayName)", () => {
  const files = DIRS.flatMap((d) => [...sources(join(ROOT, d))]);
  it("no web file defines it, and every importer uses the package path", () => {
    const defined = files.filter((f) => /export\s+function\s+useMandateDisplayName\b/.test(readFileSync(f, "utf8")));
    expect(defined.map((f) => relative(ROOT, f))).toEqual([]);
    const bad = files.flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/import\s*\{[^}]*\buseMandateDisplayName\b[^}]*\}\s*from\s*"([^"]+)"/g)]
        .map((m) => m[1])
        .filter((spec) => spec !== "@ai-matrx/chat/mandates/useMandateDisplayName")
        .map((spec) => `${relative(ROOT, f)} -> ${spec}`),
    );
    expect(bad).toEqual([]);
  });
});
