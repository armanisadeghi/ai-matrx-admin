#!/usr/bin/env node
/**
 * check:no-code-authored-user-input — repo-wide census for matrx/no-code-authored-user-input.
 * The ESLint rule screams in the editor and at lint-guard; this runs the same rule over every
 * TS/TSX file in this repo AND the sibling TypeScript trees that also talk to agents
 * (aidream/apps, matrx-extend, matrx-local), so no door is outside its sight.
 *   node scripts/check-no-code-authored-user-input.mjs [paths…]   exit 1 on any finding
 *   --self-test   proves the rule fails on the 2edb1c8aa65 incident and passes on its fix
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";
import tseslint from "typescript-eslint";
import { noCodeAuthoredUserInput } from "./lint-rules/no-code-authored-user-input.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CODE = path.resolve(ROOT, "..");
const TREES = [ROOT, path.join(CODE, "aidream/apps"), path.join(CODE, "matrx-extend"), path.join(CODE, "matrx-local")];
const linter = new Linter({ configType: "flat" });
const config = [
  {
    files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs}"],
    languageOptions: { parser: tseslint.parser, parserOptions: { sourceType: "module", ecmaFeatures: { jsx: true } } },
    plugins: { matrx: { rules: { "no-code-authored-user-input": noCodeAuthoredUserInput } } },
    rules: { "matrx/no-code-authored-user-input": "error" },
  },
];

function lint(file, code) {
  return linter.verify(code, config, { filename: file }).filter((m) => m.ruleId === "matrx/no-code-authored-user-input");
}

function filesIn(tree) {
  if (!fs.existsSync(tree)) return [];
  const out = execFileSync("git", ["-C", tree, "ls-files", "--", "*.ts", "*.tsx", "*.mts", "*.cts"], { encoding: "utf8", maxBuffer: 1 << 28 });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((f) => !/(^|\/)(node_modules|dist|generated|python-generated)\/|\.d\.ts$/.test(f))
    .map((f) => path.join(tree, f));
}

if (process.argv.includes("--self-test")) {
  const file = path.join(ROOT, "features/research/components/init/ResearchInitForm.tsx");
  const bad = execFileSync("git", ["-C", ROOT, "show", "2edb1c8aa65:features/research/components/init/ResearchInitForm.tsx"], { encoding: "utf8", maxBuffer: 1 << 26 });
  const good = fs.readFileSync(file, "utf8");
  const b = lint(file, bad).length;
  const g = lint(file, good).length;
  console.log(`incident 2edb1c8aa65: ${b} finding(s) (must be ≥1) · current file: ${g} (must be 0)`);
  process.exit(b >= 1 && g === 0 ? 0 : 1);
}

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const files = args.length ? args.map((a) => path.resolve(a)) : TREES.flatMap(filesIn);
let n = 0;
for (const f of files) {
  if (/\.(test|spec|selftest)\.|__tests__|\/app\/\(dev\)\//.test(f)) continue;
  let code;
  try { code = fs.readFileSync(f, "utf8"); } catch { continue; }
  if (!/user_?[iI]nput|userContent|user_content|role:\s*["']user|setUser(InputText|Input)|sendUserMessage/.test(code)) continue;
  for (const m of lint(f, code)) {
    n++;
    console.log(`${path.relative(CODE, f)}:${m.line}:${m.column}  ${m.message.split(". The person's")[0]}`);
  }
}
console.log(n ? `\n✖ ${n} place(s) where code writes text into the person's message. Remove it; behavior belongs to the agent, values go as variables/context.` : "✔ no code-authored text in any user message");
process.exit(n ? 1 : 0);
