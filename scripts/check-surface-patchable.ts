#!/usr/bin/env npx tsx
/**
 * check:surface-patchable — every long-text write target takes an anchored
 * edit, and every overwrite of it shows the shared diff.
 *
 * WHY (Arman, VISION 25 #3 and 40): "ask an agent to fix one word on a 5,000
 * character note and he sends a full update, instead of a patch" — and "any
 * tool that overwrites [must] show a shared diff view". The patch machinery
 * (`resolveSurfaceWritePatch`, the `[patchable]` line on `apply_surface_write`)
 * and the shared diff (`SurfaceWriteDiff`) both exist; what was missing was the
 * DECLARATION on each target. A target not marked `patchable` gets no patch
 * option at all, so the model can only resend the whole text. On 2026-10-22,
 * 14 of 731 write targets were patchable.
 *
 * THE RULE. A write target is a TEXT TARGET when:
 *   - its valueType is "string" or "document", and
 *   - it is not a fragment target (append_/insert_/prepend_, replace_selection
 *     — those carry a piece, never the whole text), and
 *   - the text it replaces (`comparisonValue ?? updatesValue`) is a declared
 *     "string" | "document" value of the same surface or item type with
 *     typicalCharCount >= TEXT_MIN_CHARS — i.e. real prose someone edits, not
 *     an id, a status or a one-line name (re-sending eight words costs
 *     nothing; see `SurfaceWriteTarget.patchable`).
 * Every text target must declare BOTH:
 *   P1  `patchable: true` — the model is offered `str_replace` etc.
 *   P2  `approvalComparison: "text-replacement"` — the approval card and the
 *       tool card always carry the before text, so an overwrite shows the
 *       shared diff (never just the new text).
 * And the fleet must not slide back:
 *   P3  the number of patchable targets never drops below BASELINE (raise it
 *       when you add more; never lower it to go green).
 *
 * A string target whose text twin is an object/array/absent is listed by
 * `--census` (no text base to anchor a patch against) — not a finding.
 *
 * Reads `ALL_MANIFESTS` — exactly what the app reads (package manifests come
 * from the installed @ai-matrx/chat, so a package-side fix counts here once
 * that package version is installed).
 *
 *   pnpm check:surface-patchable
 *   pnpm check:surface-patchable --census     # every string target + verdict
 *   pnpm check:surface-patchable:self-test    # prove each rule can fail
 *
 * Advisory by doctrine (scream, never block). Exit 0 pass · 1 finding · 2 crash.
 */

import { resolve } from "node:path";

import { exitAfterDrain } from "./lib/exit-after-drain";

const SELF_TEST = process.argv.includes("--self-test");
const CENSUS = process.argv.includes("--census");

/** Prose threshold for the text twin's declared typical size. */
export const TEXT_MIN_CHARS = 200;
/** Ratchet floor: patchable targets in ALL_MANIFESTS. Raise, never lower. */
export const BASELINE = 60;

interface ValueLike {
  name: string;
  valueType: string;
  typicalCharCount?: number;
}
interface TargetLike {
  name: string;
  valueType: string;
  updatesValue?: string;
  comparisonValue?: string;
  patchable?: boolean;
  approvalComparison?: string;
}
interface ItemTypeLike {
  name: string;
  values?: readonly ValueLike[];
  writeTargets?: readonly TargetLike[];
}
interface ManifestLike {
  surfaceName: string;
  values?: readonly ValueLike[];
  writeTargets?: readonly TargetLike[];
  itemTypes?: readonly ItemTypeLike[];
}

interface Row {
  where: string;
  target: TargetLike;
  twin: ValueLike | undefined;
}

export interface Finding {
  rule: "P1" | "P2" | "P3";
  where: string;
  message: string;
}

/** Fragment targets carry a piece, never the whole text: append_/insert_/prepend_ and
 * replace_selection (it rewrites the person's current selection, not the document). */
const FRAGMENT = /(^|_)(append|insert|prepend)(_|$)|^replace_selection$/;

function rowsOf(manifests: readonly ManifestLike[]): Row[] {
  const rows: Row[] = [];
  const add = (where: string, values: readonly ValueLike[] | undefined, targets: readonly TargetLike[] | undefined) => {
    const byName = new Map((values ?? []).map((v) => [v.name, v]));
    for (const target of targets ?? []) {
      const source = target.comparisonValue ?? target.updatesValue;
      rows.push({ where: `${where}:${target.name}`, target, twin: source ? byName.get(source) : undefined });
    }
  };
  for (const m of manifests) {
    add(m.surfaceName, m.values, m.writeTargets);
    for (const item of m.itemTypes ?? []) add(`${m.surfaceName}/${item.name}`, item.values, item.writeTargets);
  }
  return rows;
}

export function isTextTarget(row: Row): boolean {
  const { target, twin } = row;
  if (target.valueType !== "string" && target.valueType !== "document") return false;
  if (FRAGMENT.test(target.name)) return false;
  if (!twin || (twin.valueType !== "string" && twin.valueType !== "document")) return false;
  return (twin.typicalCharCount ?? 0) >= TEXT_MIN_CHARS;
}

export function runRules(manifests: readonly ManifestLike[], baseline = BASELINE): Finding[] {
  const findings: Finding[] = [];
  const rows = rowsOf(manifests);
  for (const row of rows) {
    if (!isTextTarget(row)) continue;
    if (!row.target.patchable) {
      findings.push({
        rule: "P1",
        where: row.where,
        message: `text target (twin \`${row.twin?.name}\`, ~${row.twin?.typicalCharCount} chars) is not \`patchable\` — an agent fixing one word must resend the whole text. Add \`patchable: true\`.`,
      });
    }
    if (row.target.approvalComparison !== "text-replacement") {
      findings.push({
        rule: "P2",
        where: row.where,
        message: `text target has no \`approvalComparison: "text-replacement"\` — an overwrite may show only the new text instead of the shared diff.`,
      });
    }
  }
  const patchable = rows.filter((r) => r.target.patchable).length;
  if (patchable < baseline) {
    findings.push({
      rule: "P3",
      where: "fleet",
      message: `${patchable} patchable write targets, below the committed baseline ${baseline}. A target lost \`patchable\` — restore it (never lower BASELINE to go green).`,
    });
  }
  return findings;
}

function printCensus(manifests: readonly ManifestLike[]): void {
  const rows = rowsOf(manifests);
  const strings = rows.filter((r) => r.target.valueType === "string" || r.target.valueType === "document");
  console.log(`\nSTRING/DOCUMENT WRITE TARGETS — ${strings.length} of ${rows.length}:`);
  for (const row of strings) {
    const verdict = isTextTarget(row)
      ? row.target.patchable ? "TEXT patchable" : "TEXT NOT PATCHABLE"
      : FRAGMENT.test(row.target.name)
        ? "fragment"
        : !row.twin
          ? "no twin"
          : row.twin.valueType !== "string" && row.twin.valueType !== "document"
            ? `twin is ${row.twin.valueType}`
            : `short (${row.twin.typicalCharCount ?? 0})`;
    console.log(`  ${verdict.padEnd(20)} ${row.where}${row.target.patchable && !isTextTarget(row) ? " [patchable]" : ""}`);
  }
}

function counts(manifests: readonly ManifestLike[]) {
  const rows = rowsOf(manifests);
  const text = rows.filter(isTextTarget);
  return {
    targets: rows.length,
    text: text.length,
    textPatchable: text.filter((r) => r.target.patchable).length,
    patchable: rows.filter((r) => r.target.patchable).length,
  };
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
  // Plants are judged by the findings they ADD, so a real finding elsewhere (e.g. a package
  // target fixed in source but not yet installed) never makes a plant look caught or uncaught.
  const key = (f: Finding) => `${f.rule} ${f.where}`;
  const live = new Set(runRules(manifests).map(key));
  const added = (found: Finding[]) => found.filter((f) => !live.has(key(f)));
  if (live.size > 0) console.log(`  (the live census has ${live.size} real finding(s); plants are judged on what they add)`);

  const body: ValueLike = { name: "body_text", valueType: "string", typicalCharCount: 5000 };
  const plant = (target: Partial<TargetLike>): ManifestLike => ({
    surfaceName: "planted/surface",
    values: [body],
    writeTargets: [{ name: "body", valueType: "string", updatesValue: "body_text", ...target }],
  });
  const only = (rule: Finding["rule"], all: Finding[], label: string) => {
    const found = added(all);
    ok(`${rule} ${label}`, found.some((f) => f.rule === rule), `no new ${rule} finding`);
    ok(`${rule} plant trips ${rule} alone`, found.every((f) => f.rule === rule), `also tripped ${found.map((f) => f.rule).join(",")}`);
  };
  only("P1", runRules([...manifests, plant({ approvalComparison: "text-replacement" })]), "catches a long-text target that is not patchable");
  only("P2", runRules([...manifests, plant({ patchable: true })]), "catches a patchable text target with no diff declaration");
  // P3 — drop `patchable` from one REAL patchable non-text target (in memory), so P1/P2 stay silent.
  const victim = rowsOf(manifests).find((r) => r.target.patchable && !isTextTarget(r));
  const dropped = manifests.map((m) => ({
    ...m,
    writeTargets: (m.writeTargets ?? []).map((t) => (victim && t === victim.target ? { ...t, patchable: false } : t)),
  }));
  ok("P3 has a non-text patchable target to remove", !!victim, "no candidate — plant P3 differently");
  only("P3", runRules(dropped, counts(manifests).patchable), "catches the patchable count falling below the baseline");
  // The classifier itself: a short field and a fragment are NOT text targets.
  const short = plant({});
  short.values = [{ ...body, typicalCharCount: 40 }];
  ok("a short field is not a text target", runRules([short], 0).length === 0, "short field flagged");
  ok("an append_ fragment is not a text target", runRules([{ ...plant({}), writeTargets: [{ name: "append_body", valueType: "string", updatesValue: "body_text" }] }], 0).length === 0, "fragment flagged");
  return failures;
}

async function main(): Promise<void> {
  const mod: { ALL_MANIFESTS: readonly ManifestLike[] } = await import(
    resolve(__dirname, "..", "features/surfaces/manifests/registry")
  );
  const manifests = mod.ALL_MANIFESTS;
  if (SELF_TEST) {
    console.log("SELF-TEST — each rule proved separately, in memory.");
    const failures = selfTest(manifests);
    if (failures > 0) {
      console.error(`\nSELF-TEST FAILED: ${failures} check(s).`);
      exitAfterDrain(1);
    }
    console.log("\nSELF-TEST PASSED — each rule fails for its own reason.");
    exitAfterDrain(0);
  }
  if (CENSUS) printCensus(manifests);
  const c = counts(manifests);
  const findings = runRules(manifests);
  const summary = `${c.targets} write targets · ${c.text} long-text targets · ${c.textPatchable} of them patchable · ${c.patchable} patchable in all (baseline ${BASELINE})`;
  if (findings.length === 0) {
    console.log(`Surface patchable OK: ${summary}.`);
    exitAfterDrain(0);
  }
  console.error(`\nFAIL — ${findings.length} finding(s). ${summary}.\n`);
  for (const f of findings) console.error(`  [${f.rule}] ${f.where}: ${f.message}`);
  exitAfterDrain(1);
}

main().catch((err: unknown) => {
  console.error("check:surface-patchable failed to run:", err);
  exitAfterDrain(2);
});
