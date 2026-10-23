/**
 * No paid AI call fires without the confirm step. Every workspace file that STARTS a paid extractor call
 * (`.cleanContent(` / `.runFullPipeline(`) must import `confirmPaidPdfAi`. The one exception is the knob-driven
 * auto-clean (a standing opt-in the person turned on in Settings, with its cost behind the Cost door).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { paidPdfAiQuestion } from "../extractor/confirmPaidAi";

const ROOT = join(__dirname, "..", "..");
const KNOB_OPT_IN = new Set(["workspace/extractor/AutoCleanOnOpen.tsx"]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "__tests__" || name === "node_modules") return [];
    if (statSync(p).isDirectory()) return sources(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [p] : [];
  });
}

describe("paid AI in the PDF workspace", () => {
  it("every file that starts a paid call asks first", () => {
    const offenders = sources(ROOT)
      .map((p) => ({ rel: p.slice(ROOT.length + 1), text: readFileSync(p, "utf8") }))
      .filter(({ rel, text }) => /\.(cleanContent|runFullPipeline)\(/.test(text) && !KNOB_OPT_IN.has(rel) && !text.includes("confirmPaidPdfAi"))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("the question names the page count and the way out", () => {
    const q = paidPdfAiQuestion("clean", 12);
    expect(q.costRow).toContain("12 pages");
    expect(paidPdfAiQuestion("reclean", 1).costRow).toContain("1 page.");
    expect(paidPdfAiQuestion("pipeline", 0).costRow).toContain("every page");
  });
});
