/**
 * check:offer-guarantees — an offer builder may never type away a GUARANTEED offered value.
 *
 * WHY (2026-10-05 → 2026-10-16): Orchestra "Sync agent listings" failed for every
 * Orchestra because `buildMemberRosterOffer` was typed `Omit<Partial<Offer>, "members">`.
 * `members` is a guaranteed offer of provision `orchestras.member_roster`, so the mandate
 * door refused every run (422 `mandate_inputs_rejected`) — and nothing in the type system
 * noticed, because `Partial` / `Omit` had made the promise optional.
 *
 * The generated offer types (`@ai-matrx/agents/generated/provision-offers`) mark exactly the
 * guaranteed values as REQUIRED keys. This check reads them and fails on any source that
 * takes one away from an offer type:
 *   • `Partial<XOffer>` / `Omit<Partial<XOffer>, …>` — every required key becomes optional
 *   • `Partial<Omit<XOffer, …>>`                      — same
 *   • `Partial<Pick<XOffer, keys>>`                   — the picked required keys become optional
 *   • `Omit<XOffer, keys>`                            — the omitted required keys are gone
 * An offer type with no required key (all mapped-only) is never flagged.
 *
 * The fix is the pattern in features/agents/orchestras/conductor/roleDescriberOffer.ts: the
 * builder TAKES the guaranteed value and returns `Omit<XOffer, "__kind">`, so leaving it out
 * is a type error, never a runtime refusal.
 *
 * Usage: pnpm check:offer-guarantees        (exit 1 on any finding)
 * Self-test: pnpm check:offer-guarantees:self-test
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const OFFERS_DTS = path.join(
  ROOT,
  "node_modules/@ai-matrx/agents/dist/generated/provision-offers.d.ts",
);

/** Offer interface name → its REQUIRED (guaranteed) keys, read from the generated d.ts. */
export function requiredOfferKeys(dts: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of dts.matchAll(/interface\s+(\w+Offer)\s*\{([^}]*)\}/g)) {
    const required: string[] = [];
    for (const line of m[2].split("\n")) {
      const field = /^\s*([A-Za-z_]\w*)\s*:/.exec(line);
      if (field && field[1] !== "__kind") required.push(field[1]);
    }
    out.set(m[1], required);
  }
  return out;
}

export interface GuaranteeDrop {
  line: number;
  offer: string;
  dropped: string[];
  pattern: string;
}

const KEY_LIST = String.raw`((?:\s*\|?\s*"[^"]+"\s*)+)`;

function keysOf(list: string): string[] {
  return [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Every place in `source` where a guaranteed key of a generated offer type is typed away. */
export function findGuaranteeDrops(
  source: string,
  required: Map<string, string[]>,
): GuaranteeDrop[] {
  const drops: GuaranteeDrop[] = [];
  const lineAt = (index: number) => source.slice(0, index).split("\n").length;
  const all = (offer: string) => required.get(offer) ?? [];
  const rules: Array<[RegExp, string, (m: RegExpMatchArray) => string[]]> = [
    [
      new RegExp(String.raw`Partial<\s*Pick<\s*(\w+Offer)\s*,${KEY_LIST}>\s*>`, "g"),
      "Partial<Pick<…Offer>>",
      (m) => keysOf(m[2]),
    ],
    [new RegExp(String.raw`Partial<\s*Omit<\s*(\w+Offer)\b`, "g"), "Partial<Omit<…Offer>>", (m) => all(m[1])],
    [new RegExp(String.raw`Partial<\s*(\w+Offer)\s*>`, "g"), "Partial<…Offer>", (m) => all(m[1])],
    [
      new RegExp(String.raw`(?<!Partial<\s*)Omit<\s*(\w+Offer)\s*,${KEY_LIST}>`, "g"),
      "Omit<…Offer, keys>",
      (m) => keysOf(m[2]),
    ],
  ];
  for (const [re, pattern, read] of rules) {
    for (const m of source.matchAll(re)) {
      const offer = m[1];
      if (!required.has(offer)) continue;
      const dropped = read(m).filter((k) => all(offer).includes(k));
      if (dropped.length > 0) drops.push({ line: lineAt(m.index ?? 0), offer, dropped, pattern });
    }
  }
  return drops.sort((a, b) => a.line - b.line);
}

function trackedSources(): string[] {
  const out = execFileSync("git", ["ls-files", "--", "*.ts", "*.tsx"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((f) => !f.includes("/__tests__/") && !f.startsWith("scripts/") && !/\.test\.tsx?$/.test(f));
}

function main() {
  const required = requiredOfferKeys(readFileSync(OFFERS_DTS, "utf8"));
  if (required.size === 0) {
    console.error(`check:offer-guarantees: UNMEASURED — no offer interfaces in ${OFFERS_DTS}`);
    process.exit(1);
  }
  const findings: string[] = [];
  for (const file of trackedSources()) {
    let source: string;
    try {
      source = readFileSync(path.join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    if (!source.includes("Offer")) continue;
    for (const d of findGuaranteeDrops(source, required)) {
      findings.push(
        `${file}:${d.line}  ${d.pattern} drops guaranteed ${d.dropped.map((k) => `\`${k}\``).join(", ")} of ${d.offer}`,
      );
    }
  }
  if (findings.length > 0) {
    console.error(
      `check:offer-guarantees: ${findings.length} offer type(s) drop a guaranteed value — the mandate door refuses the run (422 mandate_inputs_rejected) when one is missing.\n` +
        `Fix: the builder takes the value and returns Omit<XOffer, "__kind"> (features/agents/orchestras/conductor/roleDescriberOffer.ts).\n\n` +
        findings.join("\n"),
    );
    process.exit(1);
  }
  console.log(`check:offer-guarantees: OK — ${required.size} offer types read, no guaranteed value typed away.`);
}

if (require.main === module) main();
