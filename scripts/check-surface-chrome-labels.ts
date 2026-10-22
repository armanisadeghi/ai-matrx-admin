#!/usr/bin/env npx tsx
/**
 * check-surface-chrome-labels.ts — NO KEYS IN THE SURFACE CHROME (Arman, surface-declarations
 * VISION §22: "Our UI should NEVER EVER show" snake_case; PLAN W1: "a guard fails if a key is
 * rendered there").
 *
 *   pnpm check:surface-chrome-labels              # scan the window and the popover
 *   pnpm check:surface-chrome-labels --self-test  # prove it goes red AND green
 *   tsx scripts/check-surface-chrome-labels.ts --files a.tsx b.tsx
 *
 * Scans the Surface Context window (this repo) and the Agents popover
 * (`@ai-matrx/chat` source in the sibling aidream checkout, `AIDREAM_DIR` overrides). A FINDING is
 * a key-shaped reference — `x.name`, `x.key`, `x.surfaceName`, or the identifiers `surfaceName`,
 * `primaryName`, `activeName`, `activeSurface` — in an OUTPUT position: a JSX child, or a visible
 * attribute (`title`, `label`, `line`, `aria-label`, `placeholder`, `alt`, `description`,
 * `addLabel`, `emptyMessage`). Every surface, value and target there has a label; render it.
 * Keys as React `key`, `data-*`, handlers and comparisons are fine. A reference passed through a
 * labeler call (`getSurfaceDisplayLabel(x)`, `valueLabel(x)`, …) is not an output.
 *
 * Exit: 0 clean · 1 findings · 3 UNMEASURED (the popover source is not checked out).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const ROOT = resolve(__dirname, "..");
const AIDREAM = process.env.AIDREAM_DIR ?? resolve(ROOT, "..", "aidream");

export const DEFAULT_FILES = [
  resolve(ROOT, "features/window-panels/windows/surfaces/SurfaceContextWindow.tsx"),
  resolve(AIDREAM, "apps/shared/chat/src/surfaces/components/chrome/SurfaceAgentsPanelImpl.tsx"),
];

const VISIBLE_ATTRS = new Set([
  "title",
  "label",
  "line",
  "aria-label",
  "placeholder",
  "alt",
  "description",
  "addLabel",
  "emptyMessage",
]);
const KEY_PROPS = new Set(["name", "key", "surfaceName"]);
const KEY_IDENTS = new Set(["surfaceName", "primaryName", "activeName", "activeSurface"]);

export interface Finding {
  file: string;
  line: number;
  text: string;
}

/** The expressions whose VALUE is what gets rendered. */
function outputs(expr: ts.Expression): ts.Expression[] {
  if (ts.isParenthesizedExpression(expr)) return outputs(expr.expression);
  if (ts.isConditionalExpression(expr)) return [...outputs(expr.whenTrue), ...outputs(expr.whenFalse)];
  if (ts.isBinaryExpression(expr)) {
    const op = expr.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return outputs(expr.right);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      return [...outputs(expr.left), ...outputs(expr.right)];
    }
    if (op === ts.SyntaxKind.PlusToken) return [...outputs(expr.left), ...outputs(expr.right)];
    return [];
  }
  if (ts.isTemplateExpression(expr)) return expr.templateSpans.flatMap((span) => outputs(span.expression));
  if (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression)) {
    const method = expr.expression.name.text;
    if (method === "join") return outputs(expr.expression.expression);
    if (method === "map") {
      const cb = expr.arguments[0];
      if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && !ts.isBlock(cb.body)) {
        return outputs(cb.body as ts.Expression);
      }
    }
    return [];
  }
  return [expr];
}

function isKeyShaped(expr: ts.Expression): boolean {
  if (ts.isIdentifier(expr)) return KEY_IDENTS.has(expr.text);
  if (ts.isPropertyAccessExpression(expr)) return KEY_PROPS.has(expr.name.text);
  if (ts.isNonNullExpression(expr) || ts.isAsExpression(expr)) return isKeyShaped(expr.expression);
  return false;
}

export function scanSource(file: string, source: string): Finding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];
  const check = (container: ts.JsxExpression) => {
    if (!container.expression) return;
    for (const out of outputs(container.expression)) {
      if (!isKeyShaped(out)) continue;
      const { line } = sf.getLineAndCharacterOfPosition(out.getStart(sf));
      findings.push({ file, line: line + 1, text: container.getText(sf).replace(/\s+/g, " ").slice(0, 120) });
    }
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxExpression(node)) {
      const parent = node.parent;
      if (ts.isJsxAttribute(parent)) {
        const name = parent.name.getText(sf);
        if (VISIBLE_ATTRS.has(name)) check(node);
      } else if (ts.isJsxElement(parent) || ts.isJsxFragment(parent)) {
        check(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

function selfTest(): number {
  const red: Array<[string, string]> = [
    ["target key as a row line", `<ListRow title={entry.target.label} line={entry.target.name} />`],
    ["value key as text", `<code>{item.key}</code>`],
    ["surface key as a tooltip", `<Chip label={ref.label} title={ref.name} />`],
    ["admin-only surface key", `<div>{primaryName && isAdmin && (<p>{primaryName}</p>)}</div>`],
    ["key inside a template", "<span title={`${row.key}: unlocks`} />"],
    ["keys joined", `<span>{items.map((i) => i.key).join(", ")}</span>`],
    ["surface key in a fallback", `<span>{label ?? surfaceName}</span>`],
  ];
  const green: Array<[string, string]> = [
    ["React key and data attribute", `<ListRow key={entry.target.name} data-surface-name={surfaceName} title={entry.target.label} />`],
    ["key in a handler", `<button onClick={() => setActive(ref.name)}>{ref.label}</button>`],
    ["key through the labeler", `<span>{getSurfaceDisplayLabel(surfaceName)}</span>`],
    ["chain labels joined", `<span>{surfaceName ? surfaceLevelPlace(surfaceName).path.join(" › ") : friendly}</span>`],
    ["key in a comparison", `<Chip pressed={activeName === ref.name} label={ref.label} />`],
  ];
  let failed = 0;
  for (const [what, src] of red) {
    if (scanSource("planted.tsx", `const x = ${src};`).length === 0) {
      console.error(`SELF-TEST FAIL: missed "${what}"`);
      failed++;
    }
  }
  for (const [what, src] of green) {
    const hits = scanSource("clean.tsx", `const x = ${src};`);
    if (hits.length > 0) {
      console.error(`SELF-TEST FAIL: flagged clean "${what}": ${hits[0]!.text}`);
      failed++;
    }
  }
  if (failed) return 1;
  console.log(`self-test: ${red.length} planted keys caught, ${green.length} clean shapes passed`);
  return 0;
}

function main(): number {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) return selfTest();
  const fi = args.indexOf("--files");
  const files = fi >= 0 ? args.slice(fi + 1).map((f) => resolve(f)) : DEFAULT_FILES;
  const missing = files.filter((f) => !existsSync(f));
  if (missing.length) {
    console.error(`UNMEASURED: not checked out: ${missing.join(", ")} (set AIDREAM_DIR)`);
    return 3;
  }
  const findings = files.flatMap((f) => scanSource(f, readFileSync(f, "utf8")));
  if (findings.length === 0) {
    console.log(`check:surface-chrome-labels: ${files.length} files, no key rendered where a label exists`);
    return 0;
  }
  for (const f of findings) console.error(`${f.file}:${f.line}  ${f.text}`);
  console.error(`\n${findings.length} key(s) rendered in the surface chrome. Render the label (manifest label, getSurfaceDisplayLabel, value label).`);
  return 1;
}

process.exitCode = main();
