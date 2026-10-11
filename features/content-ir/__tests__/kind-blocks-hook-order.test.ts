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
import fs from "node:fs";
import { ESLint } from "eslint";

const ROOT = path.resolve(__dirname, "../../..");
const PACKAGE_SRC = path.resolve(ROOT, "../aidream/apps/shared/rich-content/src");

async function violations(globs: string[], cwd: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const hooks = require("eslint-plugin-react-hooks");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tsParser = require("@typescript-eslint/parser");
  const eslint = new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { "react-hooks": hooks.default ?? hooks },
        linterOptions: { reportUnusedDisableDirectives: "off" },
        rules: { "react-hooks/rules-of-hooks": "error" },
      },
    ],
  });
  const results = await eslint.lintFiles(globs);
  return results.flatMap((r) =>
    r.messages
      .filter((m) => m.ruleId === "react-hooks/rules-of-hooks")
      .map((m) => `${path.relative(cwd, r.filePath)}:${m.line} ${m.message.slice(0, 90)}`),
  );
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

  (fs.existsSync(PACKAGE_SRC) ? it : it.skip)(
    "the rich-content package sources have no conditional hook",
    async () => {
      const found = await violations(["**/*.{ts,tsx}"], PACKAGE_SRC);
      expect(found).toEqual([]);
    },
    240_000,
  );

  it("catches the quiz crash it exists for (planted break)", async () => {
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
