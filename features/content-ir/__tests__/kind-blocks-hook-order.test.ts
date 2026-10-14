/**
 * THE HOOK-ORDER GUARD. A kind block that calls a hook after an early return throws "Rendered more
 * hooks than during the previous render" the moment its loading state flips to loaded — and the
 * reader sees a raw key/value dump instead of the block. That shipped once (quiz, 2026-10-11)
 * because nobody ran the linter on the block before committing it.
 *
 * This runs `react-hooks/rules-of-hooks` as an ERROR over every place a kind block lives: the
 * app's block folders and artifact renderers, and the rich-content package sources.
 */
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../../..");
const PACKAGE_DIST = path.resolve(
  path.dirname(
    require.resolve("@ai-matrx/rich-content/display/chat-markdown/block-registry/block-dispatch"),
  ),
  "../../..",
);

async function violations(globs: string[], cwd: string): Promise<string[]> {
  // A child process: ESLint's flat-config loader needs real dynamic import, which jest's VM lacks.
  const out = execFileSync("node", [path.join(ROOT, "scripts/check-kind-hook-order.cjs"), cwd, ...globs], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(out) as string[];
}

describe("kind blocks keep their hooks in one order", () => {
  it("the app's block folders and artifact renderers have no conditional hook", async () => {
    const found = await violations(
      [
        "components/mardown-display/blocks/**/*.{ts,tsx}",
        "features/canvas/artifact-types/**/*.{ts,tsx}",
        "features/rich-content-host/**/*.{ts,tsx}",
      ],
      ROOT,
    );
    expect(found).toEqual([]);
  }, 240_000);

  it(
    "the installed rich-content package has no conditional hook",
    async () => {
      const found = await violations(["**/*.js"], PACKAGE_DIST);
      expect(found).toEqual([]);
    },
    240_000,
  );

  it("catches the quiz crash it exists for (planted break)", async () => {
    const fs = await import("node:fs");
    const dir = fs.mkdtempSync(path.join(ROOT, ".cache-hookplant-"));
    try {
      fs.writeFileSync(
        path.join(dir, "Planted.tsx"),
        'import { useState } from "react";\nexport function P({ a }: { a: boolean }) {\n  if (!a) return null;\n  const [x] = useState(1);\n  return x;\n}\n',
      );
      const found = await violations(["Planted.tsx"], dir);
      expect(found.length).toBe(1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
