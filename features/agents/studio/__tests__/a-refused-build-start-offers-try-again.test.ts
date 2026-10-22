/** Live walk 2026-10-22: a refused Describe build start showed plain text with no Try again. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

it("the Describe build error is the canonical ErrorNotice with a retry that restarts the same build", () => {
  const src = readFileSync(join(__dirname, "../components/StudioStart.tsx"), "utf8");
  const block = src.slice(src.indexOf("{buildError ? ("));
  expect(block).toMatch(/<ErrorNotice[\s\S]*?message=\{buildError\}[\s\S]*?onRetry=\{\(\) => void build\(\)\}/);
});
