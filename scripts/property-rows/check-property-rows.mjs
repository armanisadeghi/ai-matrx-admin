#!/usr/bin/env node
/**
 * check:property-rows — every label shown with its value is `PropertyRow` from
 * `@ai-matrx/design-system/controls` (owner rules, 2026-10-13: label dark medium over value dark
 * regular on one left edge, help in a tooltip, "Not provided" tag, mono only for code, collected
 * data as a one-line summary, grey meta). Agents kept hand-rolling the row — grey mono labels,
 * boxed values, italics for missing — ~30 local copies. This flags a NEW one.
 *
 * What counts as a hand-rolled row: a component DEFINED in a .tsx file whose destructured props
 * carry `label` plus `value` (and no `onChange` — that is an input), or `label` plus `children`
 * when its name says row (…Row / …Fact / …Detail / KV / KeyValue). Stat tiles (big number over a
 * small caption — Stat, Metric, Kpi, Count, Tile, Figure, Score) are a different primitive and
 * are not rows. A deliberate exception carries `property-row-exempt: <reason ≥12 chars>` in a
 * comment on the line above the definition.
 *
 * Baseline: scripts/property-rows/baseline.json lists definitions not yet migrated. It ONLY
 * shrinks — a listed file that no longer has its definition fails as STALE (delete the entry).
 *
 *   node scripts/property-rows/check-property-rows.mjs            scan, exit 1 on a new row
 *   node scripts/property-rows/check-property-rows.mjs --self-test proves it fails on a plant
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASELINE = path.join(ROOT, "scripts/property-rows/baseline.json");
const SCAN_DIRS = ["app", "features", "components", "lib", "providers", "hooks"];

const STAT_NAME = /(Stat|Metric|Kpi|KPI|Count|Tile|Figure|Score|Badge|Chip|Pill|Button|Tag|Toggle|Dropdown|Select|Picker|Input|TextArea|Editor|Copy|Peek|Popover|Legend|Meter|Bar|Cell|Node|Inspector|Indicator|Chooser|Menu)\w*$/;
const ROW_NAME = /(Row|Fact|Facts|Detail|KV|KeyValue|Pair)$/;
const EXEMPT = /property-row-exempt:\s*(.{12,})/;

// `function Name({ a, b }: …)`, `const Name = ({ a, b }: …) =>`, `const Name: React.FC<…> = ({ a, b }) =>`
const DEF = /(?:^|\n)[ \t]*(?:export\s+)?(?:function\s+([A-Z]\w*)\s*\(\s*\{([^}]*)\}|const\s+([A-Z]\w*)\s*(?::[^=]+)?=\s*\(\s*\{([^}]*)\})/g;

export function findRows(text) {
  const out = [];
  for (const m of text.matchAll(DEF)) {
    const name = m[1] ?? m[3];
    const props = (m[2] ?? m[4] ?? "").split(",").map((p) => p.trim().split(/[:=\s]/)[0]).filter(Boolean);
    if (!props.includes("label")) continue;
    if (STAT_NAME.test(name)) continue;
    // Any `on…` handler means an input or a control, not a read-only row.
    const valueRow = props.includes("value") && !props.some((p) => /^on[A-Z]/.test(p));
    const childRow = props.includes("children") && ROW_NAME.test(name);
    if (!valueRow && !childRow) continue;
    // A thin wrapper that renders the shared row (maps a copy button into `meta`, …) is fine.
    if (/<PropertyRow\b/.test(text.slice(m.index, m.index + 1500).split(/\n}\n/)[0])) continue;
    const at = m.index + (m[0].startsWith("\n") ? 1 : 0);
    const line = text.slice(0, at).split("\n").length;
    const above = text.split("\n").slice(Math.max(0, line - 3), line - 1).join("\n");
    if (EXEMPT.test(above)) continue;
    out.push({ name, line });
  }
  return out;
}

function trackedTsx() {
  const out = execSync(`git ls-files --cached --others --exclude-standard -- ${SCAN_DIRS.map((d) => `'${d}/**/*.tsx'`).join(" ")}`, { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").filter((f) => f && !/__tests__|\.test\.tsx$|\/\(dev\)\//.test(f));
}

function selfTest() {
  const planted = `function DetailRow({ label, value }: { label: string; value: string }) {\n  return <div><span className="font-mono text-muted-foreground">{label}</span><span>{value}</span></div>;\n}`;
  const plantedChildren = `const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => <div>{label}{children}</div>;`;
  const input = `function Field({ label, value, onChange }: P) { return <input value={value} onChange={onChange} />; }`;
  const stat = `function Stat({ label, value }: P) { return <div className="text-2xl">{value}</div>; }`;
  const exempt = `// property-row-exempt: a chart legend swatch, not a label/value row\nfunction LegendRow({ label, value }: P) { return null; }`;
  const wrapper = `function ConnectorField({ label, value }: P) {\n  return <PropertyRow label={label} value={value} mono meta={<CopyAction text={value} />} />;\n}`;
  const canonical = `import { PropertyRow } from "@ai-matrx/design-system/controls";\nexport function Panel() { return <PropertyRow label="Domain" value="acme.com" />; }`;
  const cases = [
    ["planted label+value row is flagged", findRows(planted).length === 1],
    ["planted label+children row is flagged", findRows(plantedChildren).length === 1],
    ["an input (onChange) is not a row", findRows(input).length === 0],
    ["a stat tile is not a row", findRows(stat).length === 0],
    ["a reasoned exemption passes", findRows(exempt).length === 0],
    ["PropertyRow usage passes", findRows(canonical).length === 0],
    ["a wrapper that renders PropertyRow passes", findRows(wrapper).length === 0],
  ];
  let ok = true;
  for (const [name, pass] of cases) {
    console.log(`${pass ? "ok  " : "FAIL"} ${name}`);
    ok &&= pass;
  }
  process.exit(ok ? 0 : 1);
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  const baseline = new Set(JSON.parse(readFileSync(BASELINE, "utf8")).entries);
  const found = new Set();
  const fresh = [];
  for (const file of trackedTsx()) {
    let text;
    try { text = readFileSync(path.join(ROOT, file), "utf8"); } catch { continue; }
    for (const r of findRows(text)) {
      const key = `${file}#${r.name}`;
      found.add(key);
      if (!baseline.has(key)) fresh.push(`${file}:${r.line}  ${r.name}`);
    }
  }
  const stale = [...baseline].filter((k) => !found.has(k));
  if (process.argv.includes("--write-baseline")) {
    const entries = [...found].sort();
    writeFileSync(BASELINE, JSON.stringify({ note: "Hand-rolled label/value rows not yet on PropertyRow. Only shrinks.", entries }, null, 2) + "\n");
    console.log(`baseline written: ${entries.length}`);
    return;
  }
  for (const f of fresh) console.error(`NEW hand-rolled label/value row: ${f} — use PropertyRow from @ai-matrx/design-system/controls`);
  for (const s of stale) console.error(`STALE baseline entry (migrated — delete it): ${s}`);
  console.log(`check:property-rows — ${found.size} remaining in baseline scope, ${fresh.length} new, ${stale.length} stale`);
  process.exit(fresh.length || stale.length ? 1 : 0);
}

await main();
