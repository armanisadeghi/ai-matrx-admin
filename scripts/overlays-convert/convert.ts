/**
 * overlays-convert — turns matrx-frontend's hand-wired overlay system into declare-once
 * @ai-matrx/summon definitions, written into a SCRATCH directory. Inert: nothing imports it and it
 * never writes inside the app tree.
 *
 *   npx tsx scripts/overlays-convert/convert.ts --out <dir> [--app <app dir>] [--pkg <overlays package dir>]
 *       [--defs-specifier @/features/overlays/definitions] [--no-typecheck]
 *
 * Inputs (read live): features/overlays/OverlayController.tsx, features/overlays/catalogue.ts,
 * features/window-panels/registry/windowRegistryMetadata.ts, features/overlays/openers/*,
 * features/overlays/callbacks/*, features/window-panels/url-sync/initUrlHydration.ts + panelKeyAliases.ts.
 *
 * Output per overlay id: <id>.overlay.ts (definition + old opener names + registry augmentation),
 * <id>.render.tsx (the controller block, moved verbatim with the listed mechanical substitutions),
 * <id>.link.ts when a URL hydrator belongs to it. Plus registry.ts (APP_OVERLAYS), openers/ and
 * callbacks/ (moved verbatim, two import specifiers rewritten), rewrite-plan.json, report.json and a
 * scratch tsconfig.json. Then it runs the equivalence checks and the type-check and prints both.
 *
 * Mechanical substitutions in render bodies (the ONLY changes to a controller block):
 *   isOpenById.<own>                                   → true
 *   dataById.<own>                                     → data (overlayData when the block declares its own `data`)
 *   dispatch(closeOverlay({ overlayId: "<own>"[, instanceId: <inst>.instanceId] }))  → close()
 *   <inst>.instanceId / <inst>.data (map form)         → instanceId / data
 *   lazy component variable                            → static import of the same module path
 * References a block makes to controller scope (dispatch, other overlays' isOpenById/dataById/
 * instancesById entries, notificationsInboxData) become hook calls at the top of the render
 * function, copied verbatim from the controller.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";

// ── args ─────────────────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
function argValue(name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}
// --app: the app tree to read (default: the checkout this script lives in). switch.ts passes a scratch export.
const APP = path.resolve(argValue("--app") ?? path.join(path.dirname(process.argv[1] ?? "."), "../.."));
const OUT_ARG = argValue("--out");
if (!OUT_ARG) {
  console.error("usage: convert.ts --out <scratch dir> [--pkg <dir>] [--defs-specifier <spec>] [--no-typecheck]");
  process.exit(2);
}
const OUT = path.resolve(OUT_ARG);
if (OUT.startsWith(path.resolve(APP, "..") + path.sep) && !OUT.includes(`${path.sep}tmp`)) {
  // Never write into the code tree (scratch only).
  if (OUT.startsWith(APP)) {
    console.error(`refusing to write inside the app tree: ${OUT}`);
    process.exit(2);
  }
}
const PKG = path.resolve(argValue("--pkg") ?? path.join(APP, "../aidream/apps/shared/summon"));
const DEFS_SPEC = argValue("--defs-specifier") ?? "@/features/overlays/definitions";
const RUN_TSC = !argv.includes("--no-typecheck");

const F = {
  controller: path.join(APP, "features/overlays/OverlayController.tsx"),
  catalogue: path.join(APP, "features/overlays/catalogue.ts"),
  metadata: path.join(APP, "features/window-panels/registry/windowRegistryMetadata.ts"),
  openers: path.join(APP, "features/overlays/openers"),
  callbacks: path.join(APP, "features/overlays/callbacks"),
  hydration: path.join(APP, "features/window-panels/url-sync/initUrlHydration.ts"),
  aliases: path.join(APP, "features/window-panels/url-sync/panelKeyAliases.ts"),
};

// ── report ───────────────────────────────────────────────────────────────────────────────────

interface NonMechanical {
  id: string;
  part: "render" | "opener" | "link" | "metadata" | "definition";
  reason: string;
}
const nonMechanical: NonMechanical[] = [];
const notes: string[] = [];
function flag(id: string, part: NonMechanical["part"], reason: string): void {
  nonMechanical.push({ id, part, reason });
}

// ── TS helpers ───────────────────────────────────────────────────────────────────────────────

function parse(file: string, text?: string): ts.SourceFile {
  const src = text ?? fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind);
}
function walk(node: ts.Node, fn: (n: ts.Node) => void): void {
  fn(node);
  node.forEachChild((c) => walk(c, fn));
}
function propName(p: ts.ObjectLiteralElementLike): string | undefined {
  if (!p.name) return undefined;
  if (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) return p.name.text;
  return undefined;
}
function literalValue(node: ts.Expression): unknown {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literalValue(node.expression);
  if (ts.isObjectLiteralExpression(node)) {
    const o: Record<string, unknown> = {};
    for (const p of node.properties) if (ts.isPropertyAssignment(p)) o[propName(p) ?? "?"] = literalValue(p.initializer);
    return o;
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((e) => literalValue(e));
  return { __expr: node.getText() };
}
const pascal = (id: string): string => id.charAt(0).toUpperCase() + id.slice(1);
const normWs = (s: string): string => s.replace(/\s+/g, "");

interface ImportSpec {
  local: string;
  module: string;
  imported: string; // "default" | "*" | name
  typeOnly: boolean;
}
/** Import pool of a source file: local name → spec, with relative specifiers made absolute (@/…). */
function importPool(sf: ts.SourceFile, rewrite?: (spec: string) => string): Map<string, ImportSpec> {
  const pool = new Map<string, ImportSpec>();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue;
    let spec = (st.moduleSpecifier as ts.StringLiteral).text;
    if (rewrite) spec = rewrite(spec);
    else spec = absolutize(sf.fileName, spec);
    const clause = st.importClause;
    const declType = clause.isTypeOnly;
    if (clause.name) pool.set(clause.name.text, { local: clause.name.text, module: spec, imported: "default", typeOnly: declType });
    const nb = clause.namedBindings;
    if (nb && ts.isNamespaceImport(nb)) pool.set(nb.name.text, { local: nb.name.text, module: spec, imported: "*", typeOnly: declType });
    if (nb && ts.isNamedImports(nb)) {
      for (const el of nb.elements) {
        pool.set(el.name.text, {
          local: el.name.text,
          module: spec,
          imported: (el.propertyName ?? el.name).text,
          typeOnly: declType || el.isTypeOnly,
        });
      }
    }
  }
  return pool;
}
function absolutize(fromFile: string, spec: string): string {
  if (!spec.startsWith(".")) return spec;
  const abs = path.resolve(path.dirname(fromFile), spec);
  return "@/" + path.relative(APP, abs).split(path.sep).join("/");
}
function renderImports(specs: ImportSpec[]): string {
  const byModule = new Map<string, { value: ImportSpec[]; type: ImportSpec[] }>();
  for (const s of specs) {
    const m = byModule.get(s.module) ?? { value: [], type: [] };
    (s.typeOnly ? m.type : m.value).push(s);
    byModule.set(s.module, m);
  }
  const lines: string[] = [];
  const fmt = (list: ImportSpec[]) =>
    list.map((s) => (s.imported === s.local ? s.local : `${s.imported} as ${s.local}`)).join(", ");
  for (const [module, { value, type }] of [...byModule.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const def = value.find((s) => s.imported === "default");
    const ns = value.find((s) => s.imported === "*");
    const named = value.filter((s) => s.imported !== "default" && s.imported !== "*");
    if (ns) lines.push(`import * as ${ns.local} from "${module}";`);
    if (def || named.length) {
      const parts = [def?.local, named.length ? `{ ${fmt(named)} }` : undefined].filter(Boolean);
      lines.push(`import ${parts.join(", ")} from "${module}";`);
    }
    const tdef = type.find((s) => s.imported === "default");
    const tnamed = type.filter((s) => s.imported !== "default" && s.imported !== "*");
    if (tdef) lines.push(`import type ${tdef.local} from "${module}";`);
    if (tnamed.length) lines.push(`import type { ${fmt(tnamed)} } from "${module}";`);
  }
  return lines.join("\n");
}
/** Identifiers a code fragment references (over-approximation that skips member names, keys, JSX attribute names). */
function referencedNames(code: string, tsx: boolean): Set<string> {
  const sf = parse(tsx ? "/x.tsx" : "/x.ts", `function __f__() {\n${code}\n}`);
  const names = new Set<string>();
  walk(sf, (n) => {
    if (!ts.isIdentifier(n)) return;
    const p = n.parent;
    if (ts.isPropertyAccessExpression(p) && p.name === n) return;
    if (ts.isQualifiedName(p) && p.right === n) return;
    if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === n) return;
    if (ts.isJsxAttribute(p) && p.name === n) return;
    if (ts.isBindingElement(p) && p.propertyName === n) return;
    names.add(n.text);
  });
  return names;
}

// ── 1. catalog ─────────────────────────────────────────────────────────────────────────────

interface CatalogueEntry {
  id: string;
  label: string;
  multi: boolean;
  isWindow: boolean;
  closesOnNavigation: boolean;
}
const catalogue = new Map<string, CatalogueEntry>();
{
  const sf = parse(F.catalogue);
  walk(sf, (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === "OVERLAY_CATALOGUE" && n.initializer) {
      let init: ts.Expression = n.initializer;
      while (ts.isSatisfiesExpression(init) || ts.isAsExpression(init)) init = init.expression;
      if (!ts.isObjectLiteralExpression(init)) return;
      for (const p of init.properties) {
        if (!ts.isPropertyAssignment(p) || !ts.isObjectLiteralExpression(p.initializer)) continue;
        const id = propName(p)!;
        const v = literalValue(p.initializer) as Record<string, unknown>;
        catalogue.set(id, {
          id,
          label: String(v.label),
          multi: v.instanceMode === "multi",
          isWindow: v.isWindow === true,
          closesOnNavigation: v.closesOnNavigation === true,
        });
      }
    }
  });
}
const IDS = [...catalogue.keys()];

// ── 2. window metadata ───────────────────────────────────────────────────────────────────────

interface MetaRow {
  overlayId: string;
  slug: string;
  kind: string;
  label: string;
  props: Map<string, ts.Expression>;
  urlKey?: string;
}
const metaRows: MetaRow[] = [];
const metaSf = parse(F.metadata);
walk(metaSf, (n) => {
  if (ts.isVariableDeclaration(n) && n.name.getText() === "STATIC_REGISTRY" && n.initializer && ts.isArrayLiteralExpression(n.initializer)) {
    for (const el of n.initializer.elements) {
      if (!ts.isObjectLiteralExpression(el)) continue;
      const props = new Map<string, ts.Expression>();
      for (const p of el.properties) if (ts.isPropertyAssignment(p)) props.set(propName(p)!, p.initializer);
      const v = (k: string) => (props.has(k) ? literalValue(props.get(k)!) : undefined);
      const url = v("urlSync") as { key?: string } | undefined;
      metaRows.push({
        overlayId: String(v("overlayId")),
        slug: String(v("slug")),
        kind: String(v("kind")),
        label: String(v("label")),
        props,
        urlKey: url?.key,
      });
    }
  }
});
const metaById = new Map<string, MetaRow>();
for (const r of metaRows) {
  if (metaById.has(r.overlayId)) flag(r.overlayId, "metadata", `two window metadata rows for one overlay id (slugs ${metaById.get(r.overlayId)!.slug}, ${r.slug}); the first is used`);
  else metaById.set(r.overlayId, r);
  if (!catalogue.has(r.overlayId)) flag(r.overlayId, "metadata", "metadata row names an overlay id that is not in the catalog");
}
const metaPool = importPool(metaSf);
const KNOWN_META_FIELDS = new Set(["slug", "overlayId", "kind", "label", "defaultData", "ephemeral", "mobilePresentation", "mobileSidebarAs", "instanceMode", "urlSync", "preservation", "deprecated"]);

// ── 3. controller ────────────────────────────────────────────────────────────────────────────

const ctlSf = parse(F.controller);
const ctlText = ctlSf.getFullText();
const ctlPool = importPool(ctlSf);
const helperFns = new Map<string, string>(); // module-level helper functions (isMessageRole, parseStepLabels)
interface LazyComp {
  name: string;
  module: string;
  exportName: string; // "default" | named
}
const lazy = new Map<string, LazyComp>();
let controllerFn: ts.FunctionDeclaration | undefined;
for (const st of ctlSf.statements) {
  if (ts.isFunctionDeclaration(st) && st.name) {
    if (st.name.text === "OverlayController") controllerFn = st;
    else helperFns.set(st.name.text, st.getText());
  }
  if (ts.isVariableStatement(st)) {
    for (const d of st.declarationList.declarations) {
      const init = d.initializer;
      if (!init || !ts.isCallExpression(init) || init.expression.getText() !== "lazyOverlay") continue;
      const name = d.name.getText();
      const loader = init.arguments[0];
      let spec = "";
      let exportName = "default";
      if (loader && ts.isArrowFunction(loader)) {
        const body = loader.body;
        const findImport = (e: ts.Node): ts.CallExpression | undefined => {
          let found: ts.CallExpression | undefined;
          walk(e, (x) => {
            if (!found && ts.isCallExpression(x) && x.expression.kind === ts.SyntaxKind.ImportKeyword) found = x;
          });
          return found;
        };
        const imp = findImport(body);
        if (imp && ts.isStringLiteral(imp.arguments[0]!)) spec = absolutize(F.controller, (imp.arguments[0] as ts.StringLiteral).text);
        // .then((m) => ({ default: m.Name }))
        if (ts.isCallExpression(body) && ts.isPropertyAccessExpression(body.expression) && body.expression.name.text === "then") {
          const cb = body.arguments[0];
          const m = cb?.getText().match(/default:\s*\w+\.(\w+)/);
          if (m) exportName = m[1]!;
          else flag(name, "render", `lazy component ${name}: .then() callback is not a { default: m.X } mapping; static import uses the module default, and the callback's side effects are dropped: ${cb?.getText().replace(/\s+/g, " ")}`);
        }
      }
      if (!spec) flag(name, "render", `lazy component ${name}: no import() path found`);
      lazy.set(name, { name, module: spec, exportName });
    }
  }
}
if (!controllerFn?.body) throw new Error("OverlayController function not found");

// controller-scope statements: dispatch, the three maps, other consts
const mapEntries: Record<"isOpenById" | "dataById" | "instancesById", Map<string, string>> = {
  isOpenById: new Map(),
  dataById: new Map(),
  instancesById: new Map(),
};
const scopeConsts = new Map<string, string>(); // other consts: name → statement text
let returnFragment: ts.JsxFragment | undefined;
for (const st of controllerFn.body.statements) {
  if (ts.isVariableStatement(st)) {
    for (const d of st.declarationList.declarations) {
      const name = d.name.getText();
      if ((name === "isOpenById" || name === "dataById" || name === "instancesById") && d.initializer && ts.isObjectLiteralExpression(d.initializer)) {
        for (const p of d.initializer.properties) if (ts.isPropertyAssignment(p)) mapEntries[name].set(propName(p)!, p.getText());
      } else {
        scopeConsts.set(name, st.getText());
      }
    }
  }
  if (ts.isExpressionStatement(st)) {
    notes.push(`controller-level statement not moved into any render module (host concern): ${st.getText().replace(/\s+/g, " ").slice(0, 160)}`);
  }
  if (ts.isReturnStatement(st) && st.expression) {
    let e: ts.Expression = st.expression;
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isJsxFragment(e)) returnFragment = e;
  }
}
if (!returnFragment) throw new Error("controller return fragment not found");

type BlockForm = "iife" | "map" | "expr";
interface Block {
  ids: string[]; // own ids (normally one)
  form: BlockForm;
  node: ts.Expression; // the JsxExpression's expression
  bodyNode: ts.Node; // statements container (Block) or expression
  instParam?: string;
  comment?: string;
}
const blocks: Block[] = [];
{
  let lastComment: string | undefined;
  for (const child of returnFragment.children) {
    if (!ts.isJsxExpression(child)) continue;
    if (!child.expression) {
      const m = child.getText().match(/\/\*\s*([A-Za-z0-9_]+)/);
      const word = m?.[1];
      if (word && catalogue.has(word)) lastComment = word;
      continue;
    }
    const e = child.expression;
    const refIds = (node: ts.Node, maps: string[]) => {
      const out: string[] = [];
      walk(node, (x) => {
        if (ts.isPropertyAccessExpression(x) && ts.isIdentifier(x.expression) && maps.includes(x.expression.text)) {
          if (!out.includes(x.name.text)) out.push(x.name.text);
        }
      });
      return out;
    };
    let block: Block | undefined;
    if (ts.isCallExpression(e) && ts.isParenthesizedExpression(e.expression) && ts.isArrowFunction(e.expression.expression) && ts.isBlock(e.expression.expression.body)) {
      const body = e.expression.expression.body;
      const candidates = refIds(body, ["isOpenById"]);
      const own = lastComment && candidates.includes(lastComment) ? [lastComment] : candidates.length === 1 ? candidates : [];
      if (own.length === 0) flag(lastComment ?? "?", "render", `IIFE block with ambiguous gate ids [${candidates.join(", ")}]`);
      block = { ids: own, form: "iife", node: e, bodyNode: body, comment: lastComment };
    } else if (
      ts.isCallExpression(e) &&
      ts.isPropertyAccessExpression(e.expression) &&
      e.expression.name.text === "map" &&
      ts.isPropertyAccessExpression(e.expression.expression) &&
      e.expression.expression.expression.getText() === "instancesById"
    ) {
      const id = e.expression.expression.name.text;
      const fn = e.arguments[0];
      if (!fn || !ts.isArrowFunction(fn)) {
        flag(id, "render", "instancesById map without an arrow function");
        continue;
      }
      block = { ids: [id], form: "map", node: e, bodyNode: fn.body, instParam: fn.parameters[0]?.name.getText(), comment: lastComment };
    } else {
      // `isOpenById.X && (...)`, `isOpenById.X ? (...) : null`, `a || b ? … : null`
      let gate: ts.Node = e;
      if (ts.isConditionalExpression(e)) gate = e.condition;
      else if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) gate = e.left;
      const own = refIds(gate, ["isOpenById"]);
      if (own.length === 0) flag(lastComment ?? "?", "render", `expression block with no isOpenById gate: ${e.getText().slice(0, 80)}`);
      if (own.length > 1) {
        for (const id of own) {
          flag(id, "render", `one controller block renders for several overlays (${own.join(" || ")}): each definition gets the block with its own gate → true, so when both are open the component renders twice (the controller rendered it once)`);
        }
      }
      block = { ids: own, form: "expr", node: e, bodyNode: e, comment: lastComment };
    }
    if (block) blocks.push(block);
    lastComment = undefined;
  }
}
const blocksById = new Map<string, Block[]>();
for (const b of blocks) for (const id of b.ids) blocksById.set(id, [...(blocksById.get(id) ?? []), b]);

// ── 4. render modules ───────────────────────────────────────────────────────────────────────

interface Edit {
  start: number;
  end: number;
  text: string;
}
function applyEdits(text: string, base: number, edits: Edit[]): string {
  // An edit inside another edit's range is dropped: the outer replacement wins.
  const outer = edits.filter((e) => !edits.some((o) => o !== e && o.start <= e.start && o.end >= e.end && (o.start < e.start || o.end > e.end)));
  const sorted = [...outer].sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of sorted) out = out.slice(0, e.start - base) + e.text + out.slice(e.end - base);
  return out;
}

interface RenderResult {
  id: string;
  body: string; // the moved block after substitutions (what the equivalence check compares)
  original: string; // the original block text
  dataName: string;
  form: BlockForm;
  instParam?: string;
  file: string;
}
const renders = new Map<string, RenderResult>();

function closeCallInfo(n: ts.Node, own: string, instParam?: string): "own" | "other" | "own-odd-instance" | undefined {
  if (!ts.isCallExpression(n) || n.expression.getText() !== "dispatch" || n.arguments.length !== 1) return undefined;
  const inner = n.arguments[0]!;
  if (!ts.isCallExpression(inner) || inner.expression.getText() !== "closeOverlay") return undefined;
  const obj = inner.arguments[0];
  if (!obj || !ts.isObjectLiteralExpression(obj)) return "other";
  let overlayId: string | undefined;
  let instanceOk = true;
  for (const p of obj.properties) {
    if (!ts.isPropertyAssignment(p)) {
      instanceOk = false;
      continue;
    }
    const k = propName(p);
    if (k === "overlayId" && ts.isStringLiteral(p.initializer)) overlayId = p.initializer.text;
    else if (k === "instanceId") instanceOk = instParam !== undefined && p.initializer.getText() === `${instParam}.instanceId`;
    else instanceOk = false;
  }
  if (overlayId !== own) return "other";
  return instanceOk ? "own" : "own-odd-instance";
}

function convertBlock(id: string, b: Block): RenderResult {
  const bodyNode = b.bodyNode;
  const isBlock = ts.isBlock(bodyNode);
  const inner = isBlock ? (bodyNode as ts.Block) : undefined;
  const regionStart = inner ? inner.statements.pos : bodyNode.getStart();
  const regionEnd = inner ? inner.statements.end : bodyNode.getEnd();
  const original = ctlText.slice(regionStart, regionEnd);
  // Does the block declare its own `data`?
  let declaresData = false;
  walk(bodyNode, (x) => {
    if ((ts.isVariableDeclaration(x) || ts.isParameter(x) || ts.isBindingElement(x)) && ts.isIdentifier(x.name) && x.name.text === "data") declaresData = true;
  });
  const dataName = declaresData ? "overlayData" : "data";
  const edits: Edit[] = [];
  const residual = { dispatch: false, maps: { isOpenById: new Set<string>(), dataById: new Set<string>(), instancesById: new Set<string>() }, consts: new Set<string>() };
  const replacedRanges: Array<[number, number]> = [];
  walk(bodyNode, (x) => {
    const info = closeCallInfo(x, id, b.instParam);
    if (info === "own") {
      edits.push({ start: x.getStart(), end: x.getEnd(), text: "close()" });
      replacedRanges.push([x.getStart(), x.getEnd()]);
      return;
    }
    if (info === "own-odd-instance") flag(id, "render", `close call with a non-mechanical instanceId kept as dispatch(closeOverlay(…)): ${x.getText().slice(0, 120)}`);
    if (ts.isPropertyAccessExpression(x) && ts.isIdentifier(x.expression)) {
      const obj = x.expression.text;
      const key = x.name.text;
      if (obj === "isOpenById" && key === id) edits.push({ start: x.getStart(), end: x.getEnd(), text: "true" });
      else if (obj === "dataById" && key === id) edits.push({ start: x.getStart(), end: x.getEnd(), text: dataName });
      else if (b.instParam && obj === b.instParam && key === "instanceId") edits.push({ start: x.getStart(), end: x.getEnd(), text: "instanceId" });
      else if (b.instParam && obj === b.instParam && key === "data") edits.push({ start: x.getStart(), end: x.getEnd(), text: dataName });
    }
  });
  const inReplaced = (pos: number) => replacedRanges.some(([s, e]) => pos >= s && pos < e);
  walk(bodyNode, (x) => {
    if (inReplaced(x.getStart())) return;
    if (ts.isIdentifier(x)) {
      const p = x.parent;
      if (ts.isPropertyAccessExpression(p) && p.name === x) return;
      if (ts.isPropertyAssignment(p) && p.name === x) return;
      if (ts.isJsxAttribute(p) && p.name === x) return;
      if (x.text === "dispatch") residual.dispatch = true;
      if (scopeConsts.has(x.text) && x.text !== "dispatch") residual.consts.add(x.text);
      if (b.instParam && x.text === b.instParam && !(ts.isParameter(p))) {
        const pa = ts.isPropertyAccessExpression(p) && p.expression === x ? p.name.text : undefined;
        if (pa !== "instanceId" && pa !== "data") flag(id, "render", `instance variable "${b.instParam}" used beyond .instanceId/.data: ${p.getText().slice(0, 80)}`);
      }
    }
    if (ts.isPropertyAccessExpression(x) && ts.isIdentifier(x.expression)) {
      const obj = x.expression.text as keyof typeof residual.maps;
      if (obj in residual.maps) {
        const key = x.name.text;
        const own = (obj === "isOpenById" || obj === "dataById") && key === id;
        if (!own) {
          if (obj === "instancesById" && key === id) flag(id, "render", "block reads its own instancesById list outside the map form");
          residual.maps[obj].add(key);
        }
      }
    }
  });
  let body = applyEdits(original, regionStart, edits);
  if (!isBlock) body = `return (${body});`;
  // preamble: controller-scope references, copied verbatim
  const pre: string[] = [];
  if (residual.dispatch) pre.push(scopeConsts.get("dispatch") ?? "const dispatch = useAppDispatch();");
  for (const m of ["isOpenById", "dataById", "instancesById"] as const) {
    const keys = [...residual.maps[m]];
    if (!keys.length) continue;
    const entries = keys.map((k) => {
      const t = mapEntries[m].get(k);
      if (!t) flag(id, "render", `${m}.${k} referenced but no controller entry exists`);
      return `    ${t ?? `${k}: undefined`},`;
    });
    pre.push(`const ${m} = {\n${entries.join("\n")}\n  };`);
    flag(id, "render", `reads other overlays' state (${m}: ${keys.join(", ")}); kept as app-store hook calls in the render function`);
  }
  for (const c of residual.consts) pre.push(scopeConsts.get(c)!);
  const props = `{ data${dataName === "data" ? "" : `: ${dataName}`}, instanceId, close }`;
  const fnText =
    `export default function render(${props}: OverlayRenderProps) {\n` +
    (pre.length ? "  " + pre.join("\n  ") + "\n" : "") +
    (isBlock ? body : `  ${body}`) +
    `\n}\n`;
  // imports
  const names = referencedNames(pre.join("\n") + "\n" + body, true);
  const specs: ImportSpec[] = [{ local: "OverlayRenderProps", module: "@ai-matrx/summon/react", imported: "OverlayRenderProps", typeOnly: true }];
  const helpers: string[] = [];
  for (const n of names) {
    const lz = lazy.get(n);
    if (lz) {
      specs.push({ local: n, module: lz.module, imported: lz.exportName, typeOnly: false });
      continue;
    }
    if (helperFns.has(n)) {
      helpers.push(n);
      continue;
    }
    const imp = ctlPool.get(n);
    if (imp && n !== "lazyOverlay") specs.push(imp);
  }
  if (helpers.length) specs.push(...helpers.map((h) => ({ local: h, module: "./controller-helpers", imported: h, typeOnly: false })));
  const file = `${id}.render.tsx`;
  const text = `"use client";\n\n${renderImports(specs)}\n\n${fnText}`;
  fs.writeFileSync(path.join(OUT, file), text);
  return { id, body, original, dataName, form: b.form, instParam: b.instParam, file };
}

// ── 5. openers ──────────────────────────────────────────────────────────────────────────────

const OVERLAY_SLICE = "@/lib/redux/slices/overlaySlice";
const PKG_CORE_NAMES = new Set(["openOverlay", "closeOverlay", "toggleOverlay", "closeAllInstancesOfOverlay", "selectIsOverlayOpen", "selectOverlayData", "selectOpenInstances", "DEFAULT_INSTANCE_ID", "closeAllOverlays", "pruneStaleInstances"]);
interface OpenerFile {
  base: string;
  file: string;
  ids: string[];
  exports: string[];
  optionsType?: string;
}
const openerFiles: OpenerFile[] = [];
function rewriteSpecifiersIn(sf: ts.SourceFile, mode: "opener" | "callback"): string {
  const text = sf.getFullText();
  const edits: Edit[] = [];
  for (const st of sf.statements) {
    if (!(ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) || !st.moduleSpecifier) continue;
    const lit = st.moduleSpecifier as ts.StringLiteral;
    const spec = lit.text;
    let next: string | undefined;
    if (spec === "@/utils/callbackManager") next = "@ai-matrx/summon/handles";
    else if (spec.startsWith("@/features/overlays/callbacks/")) next = (mode === "opener" ? "../callbacks/" : "./") + spec.slice("@/features/overlays/callbacks/".length);
    else if (spec.startsWith("@/features/overlays/openers/")) next = (mode === "opener" ? "./" : "../openers/") + spec.slice("@/features/overlays/openers/".length);
    else if (spec.startsWith("./") || spec.startsWith("../")) {
      const abs = path.resolve(path.dirname(sf.fileName), spec);
      const inMirrored = abs.startsWith(F.openers + path.sep) || abs.startsWith(F.callbacks + path.sep);
      if (!inMirrored) next = absolutize(sf.fileName, spec);
    } else if (spec === "@/features/overlays/catalogue") {
      next = "@ai-matrx/summon";
    } else if (spec === OVERLAY_SLICE && ts.isImportDeclaration(st) && st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings)) {
      const els = st.importClause.namedBindings.elements;
      const moved = els.filter((e) => PKG_CORE_NAMES.has((e.propertyName ?? e.name).text));
      const kept = els.filter((e) => !PKG_CORE_NAMES.has((e.propertyName ?? e.name).text));
      const typeKw = st.importClause.isTypeOnly ? "type " : "";
      const lines: string[] = [];
      if (moved.length) lines.push(`import ${typeKw}{ ${moved.map((e) => e.getText()).join(", ")} } from "@ai-matrx/summon";`);
      if (kept.length) {
        lines.push(`import ${typeKw}{ ${kept.map((e) => e.getText()).join(", ")} } from "${OVERLAY_SLICE}";`);
        notes.push(`${path.basename(sf.fileName)} keeps ${kept.map((e) => e.getText()).join(", ")} from the app overlaySlice (no package equivalent)`);
      }
      edits.push({ start: st.getStart(), end: st.getEnd(), text: lines.join("\n") });
      continue;
    }
    if (next !== undefined) edits.push({ start: lit.getStart(), end: lit.getEnd(), text: JSON.stringify(next) });
  }
  return applyEdits(text, 0, edits);
}
function exportNamesOf(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  for (const st of sf.statements) {
    const mods = ts.canHaveModifiers(st) ? ts.getModifiers(st) : undefined;
    const exported = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) for (const e of st.exportClause.elements) out.push(e.name.text);
    if (!exported) continue;
    if ((ts.isFunctionDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) out.push(st.name.text);
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) out.push(d.name.getText());
  }
  return out;
}
{
  fs.mkdirSync(path.join(OUT, "openers"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "callbacks"), { recursive: true });
  for (const f of fs.readdirSync(F.callbacks)) {
    if (!/\.tsx?$/.test(f) || /\.test\./.test(f)) continue;
    const sf = parse(path.join(F.callbacks, f));
    fs.writeFileSync(path.join(OUT, "callbacks", f), rewriteSpecifiersIn(sf, "callback"));
  }
  for (const f of fs.readdirSync(F.openers)) {
    if (!/\.tsx?$/.test(f) || /\.test\./.test(f)) continue;
    const full = path.join(F.openers, f);
    const sf = parse(full);
    fs.writeFileSync(path.join(OUT, "openers", f), rewriteSpecifiersIn(sf, "opener"));
    const base = f.replace(/\.tsx?$/, "");
    const literalIds = new Set<string>();
    walk(sf, (n) => {
      if (ts.isStringLiteral(n) && catalogue.has(n.text)) {
        const p = n.parent;
        const ctx = p.getText();
        if (/OVERLAY_ID|overlayId/.test(ctx) || (ts.isAsExpression(p) && /OVERLAY_ID/.test(p.parent.getText()))) literalIds.add(n.text);
      }
    });
    const exportsList = exportNamesOf(sf);
    openerFiles.push({ base, file: full, ids: catalogue.has(base) ? [base] : [...literalIds], exports: exportsList });
  }
}
const openerById = new Map<string, OpenerFile>();
for (const o of openerFiles) if (catalogue.has(o.base)) openerById.set(o.base, o);
for (const o of openerFiles) for (const id of o.ids) if (!openerById.has(id)) openerById.set(id, o);
for (const o of openerFiles) {
  if (!o.ids.length) notes.push(`opener file ${o.base} maps to no overlay id (kept in openers/, not re-exported)`);
}
function optionsTypeFor(id: string, o: OpenerFile): string | undefined {
  const cands = o.exports.filter((n) => /^Open\w*(Options|Args)$/.test(n));
  if (cands.length === 1) return cands[0];
  const P = pascal(id);
  const exact = cands.find((n) => n === `Open${P}Options`);
  if (exact) return exact;
  const loose = cands.filter((n) => n.includes(P.replace(/Window$/, "")));
  if (loose.length === 1) return loose[0];
  return undefined;
}

/** Type arguments that satisfy a generic Options type: each parameter's constraint, else unknown. */
function typeParamsOf(file: string, name: string): string[] {
  let out: string[] = [];
  walk(parse(file), (n) => {
    if ((ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && n.name.text === name && n.typeParameters)
      out = n.typeParameters.map((tp) => (tp.default ? tp.default.getText() : tp.constraint ? tp.constraint.getText() : "unknown"));
  });
  return out;
}

// ── 6. URL hydrators ────────────────────────────────────────────────────────────────────────

const hydSf = parse(F.hydration);
const hydText = hydSf.getFullText();
const hydPool = importPool(hydSf);
const linkHelperNames = new Set<string>();
for (const st of hydSf.statements) if (ts.isFunctionDeclaration(st) && st.name && st.name.text !== "initUrlHydration") linkHelperNames.add(st.name.text);
const aliasesMap = literalValue(
  (() => {
    let found: ts.Expression | undefined;
    walk(parse(F.aliases), (n) => {
      if (ts.isVariableDeclaration(n) && n.name.getText() === "PANEL_KEY_ALIASES" && n.initializer) found = n.initializer;
    });
    return found!;
  })(),
) as Record<string, string>;
interface Hydrator {
  key: string;
  fn: ts.ArrowFunction | ts.FunctionExpression;
  params: string[];
  firstOpenId?: string;
}
const hydrators: Hydrator[] = [];
function resolveConstString(ident: string): string | undefined {
  const imp = hydPool.get(ident);
  if (!imp) return undefined;
  const base = path.join(APP, imp.module.replace(/^@\//, ""));
  for (const ext of [".ts", ".tsx", "/index.ts"]) {
    if (!fs.existsSync(base + ext)) continue;
    let val: string | undefined;
    walk(parse(base + ext), (n) => {
      if (ts.isVariableDeclaration(n) && n.name.getText() === imp.imported && n.initializer) {
        const v = literalValue(n.initializer);
        if (typeof v === "string") val = v;
      }
    });
    return val;
  }
  return undefined;
}
walk(hydSf, (n) => {
  if (!ts.isCallExpression(n) || n.expression.getText() !== "registerPanelHydrator") return;
  const [k, fn] = n.arguments;
  if (!k || !fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) return;
  const key = ts.isStringLiteral(k) ? k.text : resolveConstString(k.getText());
  if (!key) {
    flag("?", "link", `hydrator key ${k.getText()} could not be resolved to a string`);
    return;
  }
  let firstOpenId: string | undefined;
  walk(fn, (x) => {
    if (firstOpenId || !ts.isCallExpression(x) || x.expression.getText() !== "openOverlay") return;
    const obj = x.arguments[0];
    if (obj && ts.isObjectLiteralExpression(obj))
      for (const p of obj.properties) if (ts.isPropertyAssignment(p) && propName(p) === "overlayId" && ts.isStringLiteral(p.initializer)) firstOpenId = p.initializer.text;
  });
  hydrators.push({ key, fn, params: fn.parameters.map((p) => p.name.getText()), firstOpenId });
});
interface LinkPlan {
  id: string;
  key: string;
  aliases: string[];
  hydrator: Hydrator;
  how: string;
}
const linkById = new Map<string, LinkPlan>();
const hydratorMapping: Array<{ key: string; id?: string; how: string }> = [];
const metaByUrlKey = new Map<string, MetaRow[]>();
for (const r of metaRows) if (r.urlKey) metaByUrlKey.set(r.urlKey, [...(metaByUrlKey.get(r.urlKey) ?? []), r]);
const aliasHydrators: Hydrator[] = [];
for (const h of hydrators) {
  if (aliasesMap[h.key]) {
    aliasHydrators.push(h);
    continue;
  }
  const rows = metaByUrlKey.get(h.key) ?? [];
  let id: string | undefined;
  let how: string;
  if (rows.length >= 1) {
    id = rows[0]!.overlayId;
    how = rows.length === 1 ? "metadata urlSync.key" : `metadata urlSync.key (first of ${rows.length} rows: ${rows.map((r) => r.overlayId).join(", ")})`;
    if (rows.length > 1) flag(id, "link", `urlSync key "${h.key}" is declared by ${rows.length} metadata rows (${rows.map((r) => r.overlayId).join(", ")}); attached to the first`);
  } else if (h.firstOpenId) {
    id = h.firstOpenId;
    how = "first openOverlay in the hydrator (no metadata row declares this key)";
    flag(id, "link", `hydrator "${h.key}" has no metadata row with that urlSync key; attached to the overlay its first openOverlay opens`);
  } else {
    how = "UNMAPPED: no metadata row and no literal openOverlay";
    flag("?", "link", `hydrator "${h.key}" could not be attached (no metadata row, no literal openOverlay id)`);
  }
  if (id && linkById.has(id)) {
    flag(id, "link", `second hydrator "${h.key}" for an overlay that already links "${linkById.get(id)!.key}"; not attached`);
    how = `CONFLICT with ${linkById.get(id)!.key}`;
    id = undefined;
  }
  if (id && !catalogue.has(id)) {
    flag(id, "link", `hydrator "${h.key}" maps to non-catalogue id`);
    id = undefined;
  }
  if (id) linkById.set(id, { id, key: h.key, aliases: [], hydrator: h, how });
  hydratorMapping.push({ key: h.key, id, how });
}
for (const h of aliasHydrators) {
  const canonical = aliasesMap[h.key]!;
  const target = [...linkById.values()].find((l) => l.key === canonical);
  if (!target) {
    hydratorMapping.push({ key: h.key, how: `UNMAPPED alias → ${canonical}` });
    flag("?", "link", `alias "${h.key}" → "${canonical}" has no canonical link definition`);
    continue;
  }
  target.aliases.push(h.key);
  const same = normWs(h.fn.body.getText()) === normWs(target.hydrator.fn.body.getText());
  if (!same) flag(target.id, "link", `alias "${h.key}" had its own hydrator body that differs from "${canonical}"'s; as an alias it now runs "${canonical}"'s hydrator`);
  hydratorMapping.push({ key: h.key, id: target.id, how: `alias of "${canonical}"${same ? " (identical hydrator body)" : " (DIFFERENT body)"}` });
}
for (const r of metaRows) if (r.urlKey && !hydrators.some((h) => h.key === r.urlKey)) flag(r.overlayId, "link", `metadata urlSync.key "${r.urlKey}" has no hydrator`);

function emitLink(plan: LinkPlan, dataType: string): string {
  const fn = plan.hydrator.fn;
  const [dName = "dispatch", iName, aName] = plan.hydrator.params;
  const body = ts.isBlock(fn.body) ? hydText.slice(fn.body.statements.pos, fn.body.statements.end) : `\n  ${fn.body.getText()};`;
  // Does the body hand `dispatch` to something that needs the app's thunk-aware type?
  let passesDispatch = false;
  walk(fn.body, (x) => {
    if (ts.isIdentifier(x) && x.text === dName && ts.isCallExpression(x.parent) && x.parent.expression !== x) passesDispatch = true;
  });
  const parts = [passesDispatch ? `dispatch: hostDispatch` : dName === "dispatch" ? "dispatch" : `dispatch: ${dName}`];
  if (iName) parts.push(iName === "id" ? "id" : `id: ${iName}`);
  if (aName) parts.push(aName === "args" ? "args" : `args: ${aName}`);
  parts.push("open");
  const pre = passesDispatch ? `\n  const ${dName} = hostDispatch as AppDispatch;` : "";
  if (passesDispatch) notes.push(`link ${plan.key} (${plan.id}): hydrator passes dispatch on; typed back to AppDispatch with one cast (package LinkHydrateContext.dispatch is erased)`);
  const names = referencedNames(body, false);
  const specs: ImportSpec[] = [
    { local: "LinkHydrateContext", module: "@ai-matrx/summon", imported: "LinkHydrateContext", typeOnly: true },
    { local: dataType, module: `./${plan.id}.overlay`, imported: dataType, typeOnly: true },
  ];
  if (passesDispatch) specs.push({ local: "AppDispatch", module: "@/lib/redux/store", imported: "AppDispatch", typeOnly: true });
  for (const n of names) {
    if (linkHelperNames.has(n)) specs.push({ local: n, module: "./link-helpers", imported: n, typeOnly: false });
    else if (n === "openOverlay") specs.push({ local: n, module: "@ai-matrx/summon", imported: "openOverlay", typeOnly: false });
    else {
      const imp = hydPool.get(n);
      if (imp) specs.push(imp);
    }
  }
  const text =
    `${renderImports(specs)}\n\n` +
    `export function hydrate({ ${parts.join(", ")} }: LinkHydrateContext<${dataType}>) {${pre}${body}\n}\n`;
  fs.writeFileSync(path.join(OUT, `${plan.id}.link.ts`), text);
  return body;
}

// ── 7. emit definitions ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(OUT, { recursive: true });
const definitionNames: string[] = [];
const restoreDefaultsCount = { emitted: 0 };
for (const id of IDS) {
  const cat = catalogue.get(id)!;
  const P = pascal(id);
  const dataType = `${P}DefinitionData`;
  const defName = `${id}Overlay`;
  definitionNames.push(defName);
  // render
  const bl = blocksById.get(id) ?? [];
  if (bl.length === 0) {
    flag(id, "render", "no controller block renders this overlay id; render module emitted as `return null`");
    fs.writeFileSync(path.join(OUT, `${id}.render.tsx`), `import type { OverlayRenderProps } from "@ai-matrx/summon/react";\n\nexport default function render(_props: OverlayRenderProps) {\n  return null;\n}\n`);
  } else {
    if (bl.length > 1) flag(id, "render", `${bl.length} controller blocks render this id; only the first was moved`);
    renders.set(id, convertBlock(id, bl[0]!));
  }
  // opener + data type
  const opener = openerById.get(id);
  const imports: string[] = [`import { defineOverlay } from "@ai-matrx/summon/react";`, `import type { OverlayWire } from "./overlay-types";`];
  let dataDecl: string;
  if (opener) {
    const opt = optionsTypeFor(id, opener);
    if (opt) {
      imports.push(`import type { ${opt} } from "./openers/${opener.base}";`);
      const params = typeParamsOf(opener.file, opt);
      dataDecl = `export type ${dataType} = ${opt}${params.length ? `<${params.join(", ")}>` : ""};`;
      if (params.length) notes.push(`${id}: ${opt} is generic; Data = ${opt}<${params.join(", ")}>`);
    } else {
      dataDecl = `export type ${dataType} = Record<string, unknown>;`;
      const opens = opener.exports.filter((n) => /^Open/.test(n));
      if (opens.length) flag(id, "definition", `opener ${opener.base} exports several Open… types (${opens.join(", ")}) and none matches the id; Data = Record<string, unknown>`);
      else notes.push(`${id}: opener takes no options (no Open…Options type); Data = Record<string, unknown>`);
    }
  } else {
    dataDecl = `export type ${dataType} = Record<string, unknown>;`;
    flag(id, "opener", "no opener file opens this overlay id; definition has no old opener names to re-export");
  }
  // window / metadata
  const row = metaById.get(id);
  const fields: string[] = [`  id: "${id}",`, `  label: ${JSON.stringify(cat.label)},`, `  instance: "${cat.multi ? "multi" : "single"}",`, `  keepAlive: "none",`, `  closesOnNavigation: ${cat.closesOnNavigation},`];
  const extraImports = new Set<string>();
  const needImportsFor = (exprText: string) => {
    for (const n of referencedNames(exprText, false)) {
      const imp = metaPool.get(n);
      if (imp && !imp.typeOnly) extraImports.add(renderImports([imp]));
    }
  };
  if (row) {
    for (const k of row.props.keys()) if (!KNOWN_META_FIELDS.has(k)) flag(id, "metadata", `metadata field "${k}" has no package home and is dropped`);
    const rowMulti = row.props.has("instanceMode") ? literalValue(row.props.get("instanceMode")!) === "multi" : undefined;
    if (rowMulti !== undefined && rowMulti !== cat.multi) flag(id, "metadata", `metadata instanceMode (${rowMulti ? "multi" : "singleton"}) disagrees with the catalog (${cat.multi ? "multi" : "singleton"}); the catalog wins`);
    if (cat.isWindow) {
      const w: string[] = [`    windowId: ${JSON.stringify(row.slug)},`];
      const copy = (from: string, to: string) => {
        const e = row.props.get(from);
        if (!e) return;
        w.push(`    ${to}: ${e.getText()},`);
        needImportsFor(e.getText());
      };
      copy("mobilePresentation", "mobile");
      copy("mobileSidebarAs", "mobileSidebarAs");
      copy("ephemeral", "ephemeral");
      copy("preservation", "preservation");
      const dep = row.props.get("deprecated");
      if (dep) {
        const v = literalValue(dep) as Record<string, unknown>;
        const parts: string[] = [];
        if (typeof v.replacedBy === "string") parts.push(`replacement: ${JSON.stringify(v.replacedBy)}`);
        if (typeof v.note === "string") parts.push(`reason: ${JSON.stringify(v.note)}`);
        w.push(`    deprecated: { ${parts.join(", ")} },`);
      }
      fields.push(`  window: {\n${w.join("\n")}\n  },`);
    } else {
      const dropped = ["mobilePresentation", "mobileSidebarAs", "ephemeral", "preservation", "deprecated"].filter((k) => row.props.has(k));
      if (dropped.length) flag(id, "metadata", `kind "${row.kind}" is not a window (catalog isWindow false); window fields ${dropped.join(", ")} not emitted`);
    }
  } else if (cat.isWindow) {
    fields.push(`  window: {},`);
    flag(id, "metadata", "window overlay with no window metadata row; window: {} (windowId defaults to the overlay id)");
  }
  // link
  const link = linkById.get(id);
  if (link) {
    emitLink(link, dataType);
    const aliases = link.aliases.length ? ` aliases: ${JSON.stringify(link.aliases)},` : "";
    fields.push(`  link: {\n    key: ${JSON.stringify(link.key)},${aliases}\n    hydrate: (ctx) => import("./${id}.link").then((m) => m.hydrate(ctx)),\n  },`);
  }
  fields.push(`  render: () => import("./${id}.render"),`);
  // restore-only defaults (see report: the package's `defaults` merges on EVERY open; the app only
  // used defaultData as the session-restore fallback)
  let restore = "";
  const dd = row?.props.get("defaultData");
  if (dd) {
    restore = `\n/** Old registry defaultData: the session-RESTORE fallback (not merged on open). */\nexport const ${id}RestoreDefaults = ${dd.getText()};\n`;
    needImportsFor(dd.getText());
    restoreDefaultsCount.emitted++;
  }
  const reexport = opener ? `\n// Old opener names, unchanged: callers only change the import path.\nexport * from "./openers/${opener.base}";\n` : "";
  const text =
    `${[...imports, ...extraImports].join("\n")}\n\n` +
    `${dataDecl}\n\n` +
    `export const ${defName} = defineOverlay<${dataType}>()({\n${fields.join("\n")}\n});\n` +
    reexport +
    restore +
    `\ndeclare module "@ai-matrx/summon" {\n  interface OverlayRegistry {\n    ${id}: OverlayWire<${dataType}>;\n  }\n}\n`;
  fs.writeFileSync(path.join(OUT, `${id}.overlay.ts`), text);
}

// shared modules
fs.writeFileSync(
  path.join(OUT, "controller-helpers.ts"),
  `${renderImports([...ctlPool.values()].filter((s) => [...helperFns.values()].some((t) => referencedNames(t, false).has(s.local))))}\n\n` +
    [...helperFns.entries()].map(([, t]) => `export ${t}`).join("\n\n") +
    "\n",
);
fs.writeFileSync(
  path.join(OUT, "overlay-types.ts"),
  `/**\n * What rides an overlay's open data. The old app typed it \`unknown\`; openers put their options on\n * it, often with null for an absent value and keys of their own (seed nonces, callback group ids).\n * The registry is typed with this wire shape; the definition's Data (the opener's options) types\n * def.useSummon / def.Controller.\n */\nexport type OverlayWire<T> = { [K in keyof T]?: T[K] | null } & { readonly [key: string]: unknown };\n\n/** The wire for an overlay whose opener sends a payload of its own shape (typed in the opener). */\nexport type UntypedOverlayWire = object;\n`,
);
fs.writeFileSync(
  path.join(OUT, "overlay-ids.ts"),
  `/** Every overlay id (plain data; replaces the catalogue's key list for id checks). */\nexport const OVERLAY_ID_INDEX: Readonly<Record<string, true>> = {\n${IDS.map((id) => `  ${id}: true,`).join("\n")}\n};\n`,
);
{
  const fnTexts = hydSf.statements.filter((s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && !!s.name && linkHelperNames.has(s.name.text));
  const code = fnTexts.map((s) => s.getText().replace(/\bOVERLAY_CATALOGUE\b/g, "OVERLAY_ID_INDEX")).join("\n\n");
  const names = referencedNames(code, false);
  const specs = [...names].map((n) => hydPool.get(n)).filter((s): s is ImportSpec => !!s && s.local !== "OVERLAY_CATALOGUE");
  specs.push({ local: "OVERLAY_ID_INDEX", module: "./overlay-ids", imported: "OVERLAY_ID_INDEX", typeOnly: false });
  fs.writeFileSync(path.join(OUT, "link-helpers.ts"), `${renderImports(specs)}\n\n${code}\n`);
}
fs.writeFileSync(
  path.join(OUT, "registry.ts"),
  IDS.map((id) => `import { ${id}Overlay } from "./${id}.overlay";`).join("\n") +
    `\n\nexport const APP_OVERLAYS = [\n${IDS.map((id) => `  ${id}Overlay,`).join("\n")}\n] as const;\n`,
);

// ── 8. rewrite plan ────────────────────────────────────────────────────────────────────────

interface PlanEntry {
  file: string;
  specifier: string;
  target: string;
  newSpecifier: string;
  names: Array<{ name: string; replacement: string | null; module?: string; status: string }>;
}
function pkgExports(entry: string): Set<string> {
  const program = ts.createProgram([path.join(PKG, "src", entry)], { noEmit: true, allowJs: false, jsx: ts.JsxEmit.ReactJSX, moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, skipLibCheck: true, paths: { "@ai-matrx/summon": [path.join(PKG, "src/index.ts")], "@ai-matrx/summon/*": [path.join(PKG, "src/*")] } });
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(path.join(PKG, "src", entry));
  const sym = sf && checker.getSymbolAtLocation(sf);
  return new Set(sym ? checker.getExportsOfModule(sym).map((s) => s.name) : []);
}
const PKG_EXPORTS: Record<string, Set<string>> = {
  "@ai-matrx/summon": pkgExports("index.ts"),
  "@ai-matrx/summon/react": pkgExports("react.ts"),
  "@ai-matrx/summon/handles": pkgExports("handles.ts"),
};
const PENDING_SECTIONS = new Set(["@ai-matrx/summon/window", "@ai-matrx/summon/url", "@ai-matrx/summon/persistence"]);
const RENAMES: Record<string, Record<string, { replacement: string | null; module?: string }>> = {
  "features/overlays/catalogue": {
    OVERLAY_CATALOGUE: { replacement: "APP_OVERLAYS", module: `${DEFS_SPEC}/registry` },
    OverlayId: { replacement: "OverlayId", module: "@ai-matrx/summon" },
    isOverlayId: { replacement: "isRegisteredOverlay", module: "@ai-matrx/summon" },
    getCatalogueEntry: { replacement: "getOverlayMeta", module: "@ai-matrx/summon" },
    OverlayCatalogueEntry: { replacement: "AnyOverlayMeta", module: "@ai-matrx/summon" },
  },
  "lib/redux/slices/overlaySlice": {
    default: { replacement: "overlaysReducer", module: "@ai-matrx/summon" },
    FullScreenEditorMode: { replacement: "FullScreenEditorMode", module: `${DEFS_SPEC}/openers/fullScreenEditor` },
  },
  "lib/redux/slices/windowManagerSlice": { default: { replacement: "windowManagerReducer", module: "@ai-matrx/summon" } },
  "lib/redux/slices/urlSyncSlice": { default: { replacement: "linksReducer", module: "@ai-matrx/summon" }, urlSyncSlice: { replacement: null } },
  "lib/redux/slices/overlayDataSlice": {
    default: { replacement: "overlayStateReducer", module: "@ai-matrx/summon" },
    overlayDataReducer: { replacement: "overlayStateReducer", module: "@ai-matrx/summon" },
    setOverlayData: { replacement: "setOverlayStateValue (different payload: {key, name, value})", module: "@ai-matrx/summon" },
    updateOverlayData: { replacement: "setOverlayStateValue (different payload)", module: "@ai-matrx/summon" },
    clearOverlayData: { replacement: "clearOverlayState", module: "@ai-matrx/summon" },
    selectOverlayData: { replacement: "selectOverlayStateFor (different key shape)", module: "@ai-matrx/summon" },
    selectTypedOverlayData: { replacement: "selectOverlayStateValue (different key shape)", module: "@ai-matrx/summon" },
    overlayDataKey: { replacement: "instanceKey", module: "@ai-matrx/summon" },
  },
  "features/overlays/OverlayController": { default: { replacement: "SummonHost (with definitions={APP_OVERLAYS})", module: "@ai-matrx/summon/react" } },
  "features/window-panels/registry/windowRegistryMetadata": {
    getStaticEntryByOverlayId: { replacement: "getOverlayMeta", module: "@ai-matrx/summon" },
    ALL_WINDOW_STATIC_METADATA: { replacement: "APP_OVERLAYS", module: `${DEFS_SPEC}/registry` },
    getStaticEntryBySlug: { replacement: null },
    isPersistableWindow: { replacement: null },
  },
};
function targetFor(rel: string): { kind: string; newSpecifier: string; renameKey?: string } | undefined {
  const noExt = rel.replace(/\.(tsx?|jsx?)$/, "").replace(/\/index$/, "");
  if (noExt.startsWith("features/overlays/openers/")) {
    const base = noExt.slice("features/overlays/openers/".length);
    const o = openerFiles.find((x) => x.base === base);
    const id = o ? (catalogue.has(base) ? base : o.ids[0]) : undefined;
    return { kind: "opener", newSpecifier: id ? `${DEFS_SPEC}/${id}.overlay` : `${DEFS_SPEC}/openers/${base}` };
  }
  if (noExt.startsWith("features/overlays/callbacks/")) return { kind: "callback", newSpecifier: `${DEFS_SPEC}/callbacks/${noExt.slice("features/overlays/callbacks/".length)}` };
  if (noExt === "features/overlays/catalogue") return { kind: "catalogue", newSpecifier: "@ai-matrx/summon", renameKey: noExt };
  if (noExt === "features/overlays/OverlayController") return { kind: "controller", newSpecifier: "@ai-matrx/summon/react", renameKey: noExt };
  if (noExt === "lib/redux/slices/overlaySlice" || noExt === "lib/redux/slices/windowManagerSlice" || noExt === "lib/redux/slices/urlSyncSlice" || noExt === "lib/redux/slices/overlayDataSlice")
    return { kind: "slice", newSpecifier: "@ai-matrx/summon", renameKey: noExt };
  if (noExt === "utils/callbackManager" || noExt === "hooks/useCallbackManager") return { kind: "callbackManager", newSpecifier: "@ai-matrx/summon/handles" };
  if (noExt.startsWith("features/window-panels/")) {
    const sub = noExt.slice("features/window-panels/".length);
    if (/^(windows|detail|tools-grid|docs|__tests__|_baselines)\//.test(sub)) return undefined;
    if (sub === "registry/windowRegistryMetadata") return { kind: "window-engine", newSpecifier: "@ai-matrx/summon", renameKey: noExt };
    if (sub.startsWith("registry/")) return { kind: "window-engine", newSpecifier: "@ai-matrx/summon" };
    if (sub.startsWith("url-sync/")) return { kind: "window-engine", newSpecifier: "@ai-matrx/summon/url" };
    if (sub.startsWith("persistence/") || sub.startsWith("WindowPersistence")) return { kind: "window-engine", newSpecifier: "@ai-matrx/summon/persistence" };
    return { kind: "window-engine", newSpecifier: "@ai-matrx/summon/window" };
  }
  return undefined;
}
function resolveSpecifier(fromFile: string, spec: string): string | undefined {
  let abs: string;
  if (spec.startsWith("@/")) abs = path.join(APP, spec.slice(2));
  else if (spec.startsWith(".")) abs = path.resolve(path.dirname(fromFile), spec);
  else return undefined;
  for (const ext of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"]) {
    const p = abs + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return path.relative(APP, p).split(path.sep).join("/");
  }
  return undefined;
}
/** Tracked .ts/.tsx files: `git ls-files` in a checkout; a filesystem walk in a scratch export (no .git). */
function listSourceFiles(root: string): string[] {
  if (fs.existsSync(path.join(root, ".git"))) {
    return execFileSync("git", ["ls-files", "*.ts", "*.tsx"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n");
  }
  const SKIP = new Set(["node_modules", ".next", ".git", ".wt", "tmp", "work", ".matrx", "_armani", "_dev", ".claude"]);
  const out: string[] = [];
  const visit = (dir: string, rel: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP.has(e.name) && !e.name.startsWith(".next")) visit(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name);
      } else if (/\.tsx?$/.test(e.name)) out.push(rel ? `${rel}/${e.name}` : e.name);
    }
  };
  visit(root, "");
  return out;
}
const plan: PlanEntry[] = [];
{
  const files = listSourceFiles(APP)
    .filter((f) => f && !f.startsWith("scripts/overlays-convert/") && fs.existsSync(path.join(APP, f)));
  for (const rel of files) {
    const full = path.join(APP, rel);
    const text = fs.readFileSync(full, "utf8");
    if (!/overlaySlice|windowManagerSlice|urlSyncSlice|overlayDataSlice|callbackManager|useCallbackManager|overlays\/|window-panels|catalogue|OverlayController|from "\.|import\("\./.test(text)) continue;
    const sf = parse(full, text);
    const visit = (spec: string, names: Array<{ name: string; local: string }>) => {
      const resolved = resolveSpecifier(full, spec);
      if (!resolved) return;
      const t = targetFor(resolved);
      if (!t) return;
      if (resolved === rel) return;
      const entry: PlanEntry = { file: rel, specifier: spec, target: resolved, newSpecifier: t.newSpecifier, names: [] };
      for (const { name } of names) {
        const ren = t.renameKey ? RENAMES[t.renameKey]?.[name] : undefined;
        if (ren) {
          entry.names.push({ name, replacement: ren.replacement, module: ren.module, status: ren.replacement ? "renamed" : "no-replacement" });
          continue;
        }
        if (t.kind === "opener" || t.kind === "callback") {
          entry.names.push({ name, replacement: name, status: "same" });
          continue;
        }
        if (PENDING_SECTIONS.has(t.newSpecifier)) {
          entry.names.push({ name, replacement: name, status: "pending-section" });
          continue;
        }
        const ex = PKG_EXPORTS[t.newSpecifier];
        if (ex?.has(name)) entry.names.push({ name, replacement: name, status: "same" });
        else entry.names.push({ name, replacement: null, status: "missing-in-package" });
      }
      plan.push(entry);
    };
    walk(sf, (n) => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        const names: Array<{ name: string; local: string }> = [];
        if (ts.isImportDeclaration(n) && n.importClause) {
          if (n.importClause.name) names.push({ name: "default", local: n.importClause.name.text });
          const nb = n.importClause.namedBindings;
          if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) names.push({ name: (e.propertyName ?? e.name).text, local: e.name.text });
          if (nb && ts.isNamespaceImport(nb)) names.push({ name: "*", local: nb.name.text });
        }
        if (ts.isExportDeclaration(n)) {
          if (n.exportClause && ts.isNamedExports(n.exportClause)) for (const e of n.exportClause.elements) names.push({ name: (e.propertyName ?? e.name).text, local: e.name.text });
          else names.push({ name: "*", local: "*" });
        }
        visit(n.moduleSpecifier.text, names);
      }
      if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) visit(n.arguments[0].text, [{ name: "*", local: "*" }]);
      if (ts.isCallExpression(n) && /^(jest|vi)\.mock$/.test(n.expression.getText()) && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) visit(n.arguments[0].text, [{ name: "*", local: "(mock)" }]);
    });
  }
}
const planSummary = (() => {
  const byKind: Record<string, { files: Set<string>; imports: number }> = {};
  const missing = new Map<string, number>();
  for (const p of plan) {
    const k = targetFor(p.target)!.kind;
    byKind[k] ??= { files: new Set(), imports: 0 };
    byKind[k].files.add(p.file);
    byKind[k].imports++;
    for (const n of p.names) if (n.status === "missing-in-package" || n.status === "no-replacement") missing.set(`${p.target}#${n.name}`, (missing.get(`${p.target}#${n.name}`) ?? 0) + 1);
  }
  return {
    totalImportSites: plan.length,
    totalFiles: new Set(plan.map((p) => p.file)).size,
    byKind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, { files: v.files.size, importSites: v.imports }])),
    namesWithoutPackageEquivalent: Object.fromEntries([...missing.entries()].sort((a, b) => b[1] - a[1])),
  };
})();
fs.writeFileSync(
  path.join(OUT, "rewrite-plan.json"),
  JSON.stringify(
    {
      generatedFrom: APP,
      definitionsSpecifier: DEFS_SPEC,
      notes: [
        "WindowPanel (and the rest of features/window-panels engine) → @ai-matrx/summon/window — section being built by Builder B; names marked pending-section.",
        "All callbackManager importers must switch in the same commit: the package handles registry is a different instance from @ai-matrx/chat's.",
      ],
      summary: planSummary,
      entries: plan,
    },
    null,
    1,
  ),
);

// ── 9. scratch tsconfig ─────────────────────────────────────────────────────────────────────

{
  const appCfg = ts.readConfigFile(path.join(APP, "tsconfig.json"), ts.sys.readFile).config as { compilerOptions: { paths: Record<string, string[]> } };
  const paths: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(appCfg.compilerOptions.paths)) paths[k] = v.map((p) => path.join(APP, p));
  // Type the generated code against the package AS PUBLISHED when the app has it installed: the
  // bundled .d.ts merges the app's OverlayRegistry augmentation where the source tree's re-exports
  // did not, so wire mismatches the source never showed are real against the shipped types (and
  // must pick the untyped wire below). The source paths remain the fallback before a publish.
  if (!fs.existsSync(path.join(APP, "node_modules/@ai-matrx/summon/package.json"))) {
    paths["@ai-matrx/summon"] = [path.join(PKG, "src/index.ts")];
    paths["@ai-matrx/summon/*"] = [path.join(PKG, "src/*")];
  }
  // The scratch dir has no node_modules above it: link the app's install so bare imports (and
  // package.json "exports" subpaths like @ai-matrx/chat/…) resolve exactly as they do in the app.
  const nm = path.join(OUT, "node_modules");
  if (!fs.existsSync(nm)) fs.symlinkSync(path.join(APP, "node_modules"), nm, "dir");
  const cfg = {
    extends: path.join(APP, "tsconfig.json"),
    compilerOptions: { paths, typeRoots: [path.join(APP, "node_modules/@types")], incremental: false, tsBuildInfoFile: null, plugins: [], noEmit: true },
    include: ["./*.ts", "./*.tsx", "./openers/**/*", "./callbacks/**/*", path.join(APP, "global.d.ts"), path.join(APP, "cartesia.d.ts"), path.join(APP, "types/typecheck-env.d.ts")],
    exclude: ["./node_modules"],
  };
  fs.writeFileSync(path.join(OUT, "tsconfig.json"), JSON.stringify(cfg, null, 2));
}

// ── 10. equivalence checks ──────────────────────────────────────────────────────────────────

const lines: string[] = [];
const log = (s: string) => {
  lines.push(s);
  console.log(s);
};
log("== overlays-convert equivalence checks ==");
const emittedIds = IDS.filter((id) => fs.existsSync(path.join(OUT, `${id}.overlay.ts`)) && fs.existsSync(path.join(OUT, `${id}.render.tsx`)));
log(`ids emitted: ${emittedIds.length}/${IDS.length} (catalog)`);
log(`controller: ${lazy.size} lazy components, ${blocks.length} gated blocks (${blocks.filter((b) => b.form === "iife").length} IIFE, ${blocks.filter((b) => b.form === "map").length} map, ${blocks.filter((b) => b.form === "expr").length} &&/ternary)`);
{
  // Independent re-derivation: regex substitutions on the original block text.
  let ok = 0;
  const diffs: string[] = [];
  for (const [id, r] of renders) {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let exp = r.original;
    const inst = r.instParam ? esc(r.instParam) : undefined;
    const closeRe = new RegExp(
      `dispatch\\(\\s*closeOverlay\\(\\s*\\{\\s*overlayId:\\s*"${esc(id)}"\\s*,?\\s*${inst ? `(?:instanceId:\\s*${inst}\\.instanceId\\s*,?\\s*)?` : ""}\\}\\s*\\)\\s*,?\\s*\\)`,
      "g",
    );
    exp = exp.replace(closeRe, "close()");
    exp = exp.replace(new RegExp(`\\bisOpenById\\.${esc(id)}\\b`, "g"), "true");
    exp = exp.replace(new RegExp(`\\bdataById\\.${esc(id)}\\b`, "g"), r.dataName);
    if (inst) {
      exp = exp.replace(new RegExp(`(?<![\\w.])${inst}\\.instanceId\\b`, "g"), "instanceId");
      exp = exp.replace(new RegExp(`(?<![\\w.])${inst}\\.data\\b`, "g"), r.dataName);
    }
    if (r.form === "expr") exp = `return (${exp});`;
    const emitted = fs.readFileSync(path.join(OUT, r.file), "utf8");
    const bodyPresent = emitted.includes(r.body);
    if (normWs(exp) === normWs(r.body) && bodyPresent) ok++;
    else diffs.push(`  ${id}: ${bodyPresent ? "" : "[body not found verbatim in module] "}first divergence at ${(() => {
      const a = normWs(exp);
      const b = normWs(r.body);
      let i = 0;
      while (i < a.length && a[i] === b[i]) i++;
      return `…${a.slice(Math.max(0, i - 40), i + 40)}… vs …${b.slice(Math.max(0, i - 40), i + 40)}…`;
    })()}`);
  }
  log(`render bodies equal to controller block after the listed substitutions: ${ok}/${renders.size}`);
  for (const d of diffs) log(d);
  const noBlock = IDS.filter((id) => !renders.has(id));
  if (noBlock.length) log(`ids with no controller block: ${noBlock.join(", ")}`);
}
{
  let spreads = 0;
  const textSpreads: string[] = [];
  for (const id of IDS) {
    const file = path.join(OUT, `${id}.render.tsx`);
    const sf = parse(file);
    walk(sf, (n) => {
      if (ts.isJsxSpreadAttribute(n)) {
        spreads++;
        textSpreads.push(`${id} (JSX spread)`);
      }
    });
    if (/\{\s*\.\.\./.test(fs.readFileSync(file, "utf8")) && !textSpreads.some((t) => t.startsWith(id))) textSpreads.push(`${id} (object spread, not a JSX prop spread)`);
  }
  log(`JSX prop spreads in render modules: ${spreads}${textSpreads.length ? ` — "{..." occurrences: ${textSpreads.join(", ")}` : ""}`);
}
{
  const mapped = metaRows.filter((r) => catalogue.has(r.overlayId) && fs.existsSync(path.join(OUT, `${r.overlayId}.overlay.ts`)));
  const windowed = mapped.filter((r) => catalogue.get(r.overlayId)!.isWindow);
  log(`metadata rows mapped: ${mapped.length}/${metaRows.length} (window options emitted for ${windowed.length}; ${mapped.length - windowed.length} non-window rows carry no window block)`);
  log(`restore defaults (defaultData) emitted as <id>RestoreDefaults: ${restoreDefaultsCount.emitted}`);
  const mappedH = hydratorMapping.filter((h) => h.id);
  log(`hydrators mapped: ${mappedH.length}/${hydrators.length}`);
  for (const h of hydratorMapping) if (!/^metadata urlSync.key$/.test(h.how)) log(`  ${h.key} → ${h.id ?? "—"} (${h.how})`);
  const aliasKeys = Object.keys(aliasesMap);
  const aliasOk = aliasKeys.filter((a) => [...linkById.values()].some((l) => l.aliases.includes(a)));
  log(`aliases mapped: ${aliasOk.length}/${aliasKeys.length} (${aliasKeys.map((a) => `${a}→${aliasesMap[a]}`).join(", ")})`);
}
log(`opener files: ${openerFiles.length} moved verbatim to openers/ (import specifiers rewritten: overlaySlice actions → @ai-matrx/summon, callbackManager → @ai-matrx/summon/handles)`);

// ── 11. type-check + export check ───────────────────────────────────────────────────────────

let tscSummary: Record<string, unknown> = { skipped: true };
{
  // every opener export name present in its definition module: the definition re-exports the
  // moved opener (`export * from "./openers/<base>"`), so compare the original opener's export
  // names with the moved copy's, and confirm the re-export line and no shadowing declaration.
  let total = 0;
  let missing = 0;
  for (const id of IDS) {
    const o = openerById.get(id);
    if (!o) continue;
    const def = fs.readFileSync(path.join(OUT, `${id}.overlay.ts`), "utf8");
    const moved = exportNamesOf(parse(path.join(OUT, "openers", path.basename(o.file))));
    const hasReexport = def.includes(`export * from "./openers/${o.base}";`);
    const own = new Set(exportNamesOf(parse(path.join(OUT, `${id}.overlay.ts`))));
    for (const name of o.exports) {
      total++;
      if (!hasReexport || !moved.includes(name) || own.has(name)) {
        missing++;
        log(`  opener export missing: ${id}.overlay.ts lacks ${name}`);
      }
    }
  }
  log(`opener export names present in definition modules: ${total - missing}/${total}`);
  tscSummary = { openerExports: { total, missing } };
}
interface TscRun {
  gen: string[];
  genRaw: Array<{ file: string; code: string; msg: string }>;
  other: number;
  otherByFile: Map<string, number>;
  otherMessages: string[];
  seconds: number;
  unparsed: string[];
}
function runTsc(): TscRun {
  const t0 = Date.now();
  let out = "";
  try {
    out = execFileSync("bash", [path.join(APP, "scripts/tsc-capped.sh"), "tsc", "--noEmit", "--pretty", "false", "-p", path.join(OUT, "tsconfig.json")], {
      cwd: OUT,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    out = (err.stdout ?? "") + (err.stderr ?? "");
  }
  const realOut = fs.realpathSync(OUT);
  const diagRe = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
  const r: TscRun = { gen: [], genRaw: [], other: 0, otherByFile: new Map(), otherMessages: [], seconds: 0, unparsed: [] };
  for (const line of out.split("\n")) {
    const m = line.match(diagRe);
    if (!m) continue;
    const abs = path.resolve(OUT, m[1]!);
    if (abs.startsWith(OUT + "/") || abs.startsWith(realOut + "/")) {
      const rel = path.relative(abs.startsWith(OUT + "/") ? OUT : realOut, abs);
      r.gen.push(`${rel}(${m[2]},${m[3]}): ${m[4]}: ${m[5]}`);
      r.genRaw.push({ file: rel, code: m[4]!, msg: m[5]! });
    } else {
      r.other++;
      const k = path.relative(APP, abs);
      r.otherByFile.set(k, (r.otherByFile.get(k) ?? 0) + 1);
      if (abs.startsWith(PKG + "/")) r.otherMessages.push(`${path.relative(PKG, abs)}(${m[2]},${m[3]}): ${m[4]}: ${m[5]}`);
    }
  }
  r.unparsed = out.split("\n").filter((l) => l.trim() && !diagRe.test(l) && !/^\s/.test(l)).slice(0, 20);
  r.seconds = Math.round((Date.now() - t0) / 1000);
  return r;
}
if (RUN_TSC) {
  let run = runTsc();
  // Pass 2: an overlay whose opener/hydrator puts data on the wire that does not fit
  // OverlayWire<options> (an interface-typed payload, a different key type) is registered with the
  // untyped wire (`object`, what the app's `data: unknown` was) — listed, never hidden.
  const loose = new Set<string>();
  for (const d of run.genRaw) {
    if (!/OverlayWire|OpenOverlayPayload/.test(d.msg) && !["TS2322", "TS2345", "TS2353"].includes(d.code)) continue;
    const link = d.file.match(/^([A-Za-z0-9]+)\.link\.ts$/);
    if (link) loose.add(link[1]!);
    const op = d.file.match(/^openers\/(.+)\.tsx?$/);
    if (op) for (const id of IDS) if (openerById.get(id)?.base === op[1]) loose.add(id);
  }
  if (loose.size) {
    for (const id of loose) {
      const f = path.join(OUT, `${id}.overlay.ts`);
      const t = fs.readFileSync(f, "utf8").replace(new RegExp(`(\\n    ${id}: )OverlayWire<[A-Za-z0-9]+>;`), "$1UntypedOverlayWire;").replace("import type { OverlayWire }", "import type { UntypedOverlayWire }");
      fs.writeFileSync(f, t);
      flag(id, "definition", "its opener/hydrator puts data on the wire that does not fit OverlayWire<options>; registry entry typed UntypedOverlayWire (object), as the app's data: unknown was");
    }
    log(`\n(pass 1: ${run.gen.length} errors in generated files; ${loose.size} overlays switched to the untyped wire: ${[...loose].join(", ")})`);
    run = runTsc();
  }
  log(`\n== tsc --noEmit (native tsc via scripts/tsc-capped.sh, scratch tsconfig, ${run.seconds} s) ==`);
  log(`errors in generated files: ${run.gen.length}`);
  for (const d of run.gen.slice(0, 400)) log("  " + d);
  log(`errors originating in existing (non-generated) files: ${run.other} across ${run.otherByFile.size} files`);
  for (const [f, c] of [...run.otherByFile.entries()].sort((a, b) => b[1] - a[1])) log(`  ${c}  ${f}`);
  if (run.otherMessages.length) {
    log(`  of which inside the overlays package source (needs a package change):`);
    for (const m of run.otherMessages) log(`    ${m}`);
  }
  if (run.unparsed.length) log(`other compiler output:\n  ${run.unparsed.join("\n  ")}`);
  tscSummary = { ...tscSummary, generatedErrors: run.gen.length, otherErrors: run.other, otherByFile: Object.fromEntries(run.otherByFile), packageErrors: run.otherMessages, untypedWire: [...loose] };
}

// ── 12. report ───────────────────────────────────────────────────────────────────────────────

log(`\n== non-mechanical items (${nonMechanical.length}) ==`);
for (const n of nonMechanical) log(`  [${n.part}] ${n.id}: ${n.reason}`);
if (notes.length) {
  log(`\n== notes (${notes.length}) ==`);
  for (const n of notes) log("  " + n);
}
log(`\nrewrite-plan.json: ${planSummary.totalImportSites} import sites in ${planSummary.totalFiles} files`);
for (const [k, v] of Object.entries(planSummary.byKind)) log(`  ${k}: ${v.importSites} sites / ${v.files} files`);
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ nonMechanical, notes, hydratorMapping, tsc: tscSummary, plan: planSummary }, null, 1));
fs.writeFileSync(path.join(OUT, "checks.txt"), lines.join("\n") + "\n");
console.log(`\nout: ${OUT}`);
