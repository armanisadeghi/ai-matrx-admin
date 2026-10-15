/**
 * pnpm check:knob-reads-declared [--base <ref>] [--write] [--self-test]
 *
 * Config attestation (lane CONFIG-ATTEST-ROLLOUT): every knob or app-config read the web app makes
 * must be declarable in the release manifest (scripts/config-attestation/lib.ts). A read whose
 * address is computed at run time cannot be declared, and at run time the server files it as
 * `missing` (red). Two limits:
 *
 *   1. THE CEILING (unresolved-ceiling.json): the stated number of unresolved sites the app may
 *      carry. Shrink-only: `--write` lowers it to today's count, never raises it.
 *   2. THE RATCHET (base mode, like the cost checker): only what THIS diff adds fails — an
 *      unresolved site in the working tree that the base (default origin/main) does not have.
 *      Unresolved sites above the ceiling that are already on the base are other people's
 *      additions: a counted WARNING, never a failure (pre-launch gates are advisory).
 *
 * Fix an added site by passing a literal / a module constant / an exported `{ feature, key }`
 * pair constant, or declare a genuinely computed read with `// KNOB READS "feature" "k1" "k2"`
 * on one of the 3 lines above it.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DynamicRead } from "../settings-guards/lib";
import { scanKnobReads, ROOT } from "../settings-guards/lib";
import { CEILING_REL, declaredAt, dynamicId, git, readCeiling, registryAt } from "./lib";

export interface Verdict {
  added: DynamicRead[];
  current: number;
  base: number;
  ceiling: number;
  /** Unresolved sites above the ceiling that the base already carried (others' additions). */
  inheritedOver: number;
  fail: boolean;
}

/** Pure. `added` = sites in `current` beyond the base's count for the same id. */
export function judge(current: DynamicRead[], base: DynamicRead[], ceiling: number): Verdict {
  const baseCount = new Map<string, number>();
  for (const d of base) baseCount.set(dynamicId(d), (baseCount.get(dynamicId(d)) ?? 0) + 1);
  const added: DynamicRead[] = [];
  for (const d of current) {
    const n = baseCount.get(dynamicId(d)) ?? 0;
    if (n > 0) baseCount.set(dynamicId(d), n - 1);
    else added.push(d);
  }
  const inheritedOver = Math.max(0, Math.min(base.length, current.length) - ceiling);
  return { added, current: current.length, base: base.length, ceiling, inheritedOver, fail: added.length > 0 };
}

function selfTest(): void {
  const registry = registryAt("WORKTREE");
  const clean = scanKnobReads(
    [{ abs: "x", rel: "matrx-frontend/features/x/a.tsx", text: 'const v = useEffectiveKnob(o, u, "billing.points_rate");' }],
    registry,
    { strictConsts: true },
  );
  const injected = scanKnobReads(
    [{ abs: "x", rel: "matrx-frontend/features/x/a.tsx", text: "const v = useEffectiveKnob(o, u, keyFor(kind));" }],
    registry,
    { strictConsts: true },
  );
  const failing = judge(injected.dynamic, clean.dynamic, 0);
  if (!failing.fail) throw new Error("self-test: a computed useEffectiveKnob read was NOT flagged");
  const annotated = scanKnobReads(
    [{ abs: "x", rel: "matrx-frontend/features/x/a.tsx", text: '// KNOB READS "billing" "points_rate"\nconst v = useEffectiveKnob(o, u, keyFor(kind));' }],
    registry,
    { strictConsts: true },
  );
  if (judge(annotated.dynamic, clean.dynamic, 0).fail) throw new Error("self-test: a KNOB READS-annotated read still failed");
  const stale = scanKnobReads(
    [{ abs: "x", rel: "matrx-frontend/features/x/a.tsx", text: '// KNOB READS "billing" "points_rate"\nconst v = 1;' }],
    registry,
    { strictConsts: true },
  );
  if (stale.annotations[0]?.covered !== false) throw new Error("self-test: an annotation with no computed read was not reported uncovered");
  const collide = scanKnobReads(
    [
      { abs: "a", rel: "matrx-frontend/a.ts", text: 'export const FEATURE_X = "billing";' },
      { abs: "b", rel: "matrx-frontend/b.ts", text: 'export const FEATURE_X = "approvals";' },
      { abs: "c", rel: "matrx-frontend/c.ts", text: 'await knobInt(FEATURE_X, "page_size");' },
    ],
    registry,
    { strictConsts: true },
  );
  if (collide.sites.length !== 0 || collide.dynamic.length !== 1) throw new Error("self-test: a colliding constant name was guessed instead of unresolved");
  console.log("✓ check:knob-reads-declared self-test: computed read fails, annotation passes, stale annotation and name collision are caught");
}

function main(): void {
  if (process.argv.includes("--self-test")) return selfTest();
  const i = process.argv.indexOf("--base");
  const baseRef = i >= 0 ? process.argv[i + 1] : "origin/main";
  const baseSha = git(["rev-parse", baseRef]).trim();
  const current = declaredAt("WORKTREE");
  let base: DynamicRead[];
  try {
    base = declaredAt(baseSha).dynamic;
  } catch (error) {
    // The base predates the registry snapshot: everything on it counts as inherited.
    console.warn(`WARNING: base ${baseRef} cannot be scanned (${String(error).slice(0, 160)}); judging against the ceiling only.`);
    base = current.dynamic;
  }
  const { ceiling, why } = readCeiling();
  const v = judge(current.dynamic, base, ceiling);
  const uncovered = current.annotations.filter((a) => !a.covered);
  if (process.argv.includes("--write")) {
    if (v.current < ceiling) {
      writeFileSync(join(ROOT, CEILING_REL), JSON.stringify({ ceiling: v.current, why }, null, 2) + "\n");
      console.log(`ceiling lowered ${ceiling} → ${v.current}`);
    } else console.log(`ceiling stays ${ceiling} (current ${v.current}); it never rises`);
    return;
  }
  console.log(`unresolved knob/app-config read sites: ${v.current} (base ${baseRef} ${v.base}, ceiling ${ceiling})`);
  if (v.inheritedOver > 0) console.log(`WARNING: ${v.inheritedOver} unresolved site(s) above the ceiling were added on ${baseRef} by others`);
  for (const a of uncovered) console.log(`  STALE KNOB READS  ${a.file}:${a.line}  "${a.feature}" ${a.keys.join(" ")} — no computed read below it`);
  if (v.fail || uncovered.length) {
    for (const d of v.added) console.log(`  NEW  ${d.file}:${d.line}  ${d.fn}(${d.raw}) — ${d.why}`);
    console.log(
      `✗ this diff adds ${v.added.length} unresolved read(s)${uncovered.length ? ` and ${uncovered.length} stale annotation(s)` : ""}. ` +
        'Pass a literal or exported constant, or declare it with // KNOB READS "feature" "key" above the read.',
    );
    process.exit(1);
  }
  console.log("✓ no unresolved reads added by this diff");
}

main();
