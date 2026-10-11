#!/usr/bin/env node
// Runs react-hooks/rules-of-hooks (error) over the given globs from the given cwd; prints a JSON array
// of violations. Used by features/content-ir/__tests__/kind-blocks-hook-order.test.ts.
// usage: node scripts/check-kind-hook-order.cjs <cwd> <glob>...
const path = require("node:path");
const { ESLint } = require("eslint");
const hooks = require("eslint-plugin-react-hooks");
const tsParser = require("@typescript-eslint/parser");
(async () => {
  const [cwd, ...globs] = process.argv.slice(2);
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
  const out = results.flatMap((r) =>
    r.messages
      .filter((m) => m.ruleId === "react-hooks/rules-of-hooks")
      .map((m) => `${path.relative(cwd, r.filePath)}:${m.line} ${m.message.slice(0, 90)}`),
  );
  process.stdout.write(JSON.stringify(out));
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
