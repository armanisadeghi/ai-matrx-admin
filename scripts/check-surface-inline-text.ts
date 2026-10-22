#!/usr/bin/env npx tsx
/**
 * check:surface-inline-text — a record's text that is small enough to pass whole
 * goes to the agent whole.
 *
 * WHY (Arman, VISION 31, 2026-09-30): "I'm on a note that is in total only 3,500
 * characters yet the agent is making a tool call to access the content. That
 * means the surface isn't smart enough to just pass it all." A value with no
 * `inlineUpTo` gets the platform default (200 chars, server
 * `DEFAULT_INLINE_THRESHOLD`): anything longer reaches the agent as a pointer it
 * must fetch. So every value carrying a record's main text — a note, a document
 * body, a description, a transcript, a brief — declares `inlineUpTo`.
 *
 * THE CANONICAL NUMBERS (one per kind; the server constants are not touched):
 *   BODY_INLINE  6,000 — a record's main text/document body. Matches the
 *                        server's PAGELESS_CONTENT_INLINE_CEILING (6,000) and the
 *                        "focused page" share of PAGE_CONTEXT_BUDGET.
 *   DESC_INLINE  2,000 — descriptions, bios, comments, goals, short prompts.
 * A surface's inline sum stays within PAGE_CONTEXT_BUDGET (10,000; the
 * declaration check refuses more without `contextBudgetApproval`), so a body
 * whose page is already full is listed by `--census` as "budget full".
 *
 * THE RULE. A TEXT-BODY value is a "string" | "document" value, sent up front
 * (autoContext not false), typically longer than the 200-char default, whose
 * name says it is a record's text (description, body, content, markdown,
 * transcript, instructions, bio, notes, brief, statement, document, outline,
 * material, prompt, comments, goals, or *_text) — minus the EXCLUDED shapes
 * (selection windows, the baseline `content` picker, lists, tables, css/js,
 * last-message echoes; reasons beside each pattern).
 *   I1  the number of text-body values WITHOUT `inlineUpTo` never rises above
 *       BASELINE (lower it when you add more; never raise it to go green).
 *
 * Reads `ALL_MANIFESTS` — exactly what the app reads (package manifests come
 * from the installed @ai-matrx/chat).
 *
 *   pnpm check:surface-inline-text
 *   pnpm check:surface-inline-text --census     # every text-body value + its limit
 *   pnpm check:surface-inline-text:self-test    # prove the rule can fail
 *
 * Advisory by doctrine (scream, never block). Exit 0 pass · 1 finding · 2 crash.
 */

import { resolve } from "node:path";

import { exitAfterDrain } from "./lib/exit-after-drain";

const SELF_TEST = process.argv.includes("--self-test");
const CENSUS = process.argv.includes("--census");

export const BODY_INLINE = 6000;
export const DESC_INLINE = 2000;
/** The platform default inline limit; a value typically under it is already whole. */
export const DEFAULT_INLINE = 200;
/** Ratchet ceiling: text-body values in ALL_MANIFESTS with no `inlineUpTo`. Lower, never raise. */
export const BASELINE = 10;

const TEXT_BODY = /(^|_)(description|body|content|markdown|transcript|transcription|instructions?|bio|notes?|brief|statement|document|outline|material|prompt|comments|goals)($|_)|_text$/;
const EXCLUDED: ReadonlyArray<[RegExp, string]> = [
  [/^(text_before|text_after|selection)$/, "selection window (baseline), not a record's text"],
  [/^content$/, "baseline `content` picker on every surface; each page carries its own body value or bundle"],
  [/^(selected_(?!task|item)|current_(section|page|cell|message)|page_range|active_scope|active_pane|active_text|last_|injected_)/, "a slice of the page the person is pointing at, not the record's text"],
  [/(_list|_tsv|_csv|_structure|_css|_js|_content_text)$|^(css|js)_content$/, "a list, table or code asset, not prose"],
  [/(^|_)(draft|custom_output)_text$|_draft$/, "an unsaved twin of a body that is declared separately"],
  [/^(welcome|error|pre_execution)_message$|help_text$/, "chrome text, not a record's text"],
];

interface ValueLike {
  name: string;
  valueType: string;
  typicalCharCount?: number;
  autoContext?: boolean;
  inlineUpTo?: number;
}
interface ManifestLike {
  surfaceName: string;
  values?: readonly ValueLike[];
}

export function exclusion(name: string): string | null {
  for (const [re, why] of EXCLUDED) if (re.test(name)) return why;
  return null;
}

export function isTextBody(v: ValueLike): boolean {
  if (v.valueType !== "string" && v.valueType !== "document") return false;
  if (v.autoContext === false) return false;
  if ((v.typicalCharCount ?? 0) <= DEFAULT_INLINE) return false;
  if (!TEXT_BODY.test(v.name)) return false;
  return exclusion(v.name) === null;
}

interface Row {
  where: string;
  value: ValueLike;
}

function rowsOf(manifests: readonly ManifestLike[]): Row[] {
  const rows: Row[] = [];
  for (const m of manifests)
    for (const value of m.values ?? []) if (isTextBody(value)) rows.push({ where: `${m.surfaceName}:${value.name}`, value });
  return rows;
}

export interface Finding {
  rule: "I1";
  where: string;
  message: string;
}

export function runRules(manifests: readonly ManifestLike[], baseline = BASELINE): Finding[] {
  const missing = rowsOf(manifests).filter((r) => r.value.inlineUpTo === undefined);
  if (missing.length <= baseline) return [];
  return [
    {
      rule: "I1",
      where: "fleet",
      message: `${missing.length} text-body values have no \`inlineUpTo\` (ceiling ${baseline}) — a record's text over 200 chars reaches the agent as a pointer it must fetch. Give the new one ${BODY_INLINE} (a body) or ${DESC_INLINE} (a description) within the page's 10,000 budget; \`--census\` lists them.`,
    },
  ];
}

function counts(manifests: readonly ManifestLike[]) {
  const rows = rowsOf(manifests);
  return { textBody: rows.length, inlined: rows.filter((r) => r.value.inlineUpTo !== undefined).length };
}

function printCensus(manifests: readonly ManifestLike[]): void {
  const rows = rowsOf(manifests);
  const budget = new Map(manifests.map((m) => [m.surfaceName, (m.values ?? []).reduce((s, v) => s + (v.inlineUpTo ?? 0), 0)]));
  console.log(`\nTEXT-BODY VALUES — ${rows.length}:`);
  for (const r of rows) {
    const surface = r.where.split(":")[0]!;
    const verdict = r.value.inlineUpTo !== undefined ? `inline ${r.value.inlineUpTo}` : `NO LIMIT (page sum ${budget.get(surface)})`;
    console.log(`  ${verdict.padEnd(28)} ${r.where} (~${r.value.typicalCharCount})`);
  }
}

function selfTest(manifests: readonly ManifestLike[]): number {
  let failures = 0;
  const ok = (label: string, cond: boolean, detail: string) => {
    if (cond) console.log(`  ✓ ${label}`);
    else {
      failures += 1;
      console.error(`  ✗ ${label} — ${detail}`);
    }
  };
  const live = counts(manifests);
  const missing = live.textBody - live.inlined;
  const plant = (v: Partial<ValueLike>): ManifestLike => ({
    surfaceName: "planted/surface",
    values: [{ name: "note_body", valueType: "string", typicalCharCount: 3500, ...v }],
  });
  ok("I1 catches a new note body with no inlineUpTo", runRules([...manifests, plant({})], missing).length === 1, "no finding");
  ok("I1 is silent when the planted body declares inlineUpTo", runRules([...manifests, plant({ inlineUpTo: BODY_INLINE })], missing).length === 0, "finding anyway");
  ok("a short field is not a text body", !isTextBody({ name: "title_description", valueType: "string", typicalCharCount: 80 }), "short field counted");
  ok("a selection window is not a text body", !isTextBody({ name: "text_before", valueType: "string", typicalCharCount: 500 }), "selection counted");
  ok("a value not sent up front is not a text body", !isTextBody({ name: "page_body", valueType: "string", typicalCharCount: 4000, autoContext: false }), "bindable-only value counted");
  ok("an object is not a text body", !isTextBody({ name: "body", valueType: "object", typicalCharCount: 4000 }), "object counted");
  return failures;
}

async function main(): Promise<void> {
  const mod: { ALL_MANIFESTS: readonly ManifestLike[] } = await import(
    resolve(__dirname, "..", "features/surfaces/manifests/registry")
  );
  const manifests = mod.ALL_MANIFESTS;
  if (SELF_TEST) {
    console.log("SELF-TEST — the rule proved in memory.");
    const failures = selfTest(manifests);
    if (failures > 0) {
      console.error(`\nSELF-TEST FAILED: ${failures} check(s).`);
      exitAfterDrain(1);
    }
    console.log("\nSELF-TEST PASSED.");
    exitAfterDrain(0);
  }
  if (CENSUS) printCensus(manifests);
  const c = counts(manifests);
  const findings = runRules(manifests);
  const summary = `${c.textBody} text-body values · ${c.inlined} declare inlineUpTo · ${c.textBody - c.inlined} without (ceiling ${BASELINE})`;
  if (findings.length === 0) {
    console.log(`Surface inline text OK: ${summary}.`);
    exitAfterDrain(0);
  }
  console.error(`\nFAIL — ${summary}.\n`);
  for (const f of findings) console.error(`  [${f.rule}] ${f.where}: ${f.message}`);
  exitAfterDrain(1);
}

main().catch((err: unknown) => {
  console.error("check:surface-inline-text failed to run:", err);
  exitAfterDrain(2);
});
