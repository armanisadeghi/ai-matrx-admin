// features/applets-host/builder/layout-code.ts — A BUILDER ANSWER THAT IS STILL A STOCK LAYOUT STAYS ONE.
//
// A layout Applet opens in the builder as its one entry file (`./layout-source.ts`). When the answer is
// still exactly that shape — one file, imports only from "@ai-matrx/applets/react", plain constants, and
// `export default function App() { return <XLayout job="…" options={…} />; }` (or `<StockLayout layout={…} />`)
// — the change is read back into `layout_config` and the Applet stays a layout: the builder improves a
// simple Applet, it never replaces one by accident. Anything more (a table, a page, a hook, a slot) is code.
// Read statically from the syntax tree: nothing in the answer runs. Loaded on demand with the checks.
import type * as t from "@babel/types";
import type { AppletLayout, AppletLayoutKind } from "@ai-matrx/applets";
import { layoutOf } from "@ai-matrx/applets/platform";

import { parseAppletFile } from "./applet-code-checks";
import type { BuilderApplet } from "./build-applet";
import { LAYOUT_COMPONENTS } from "./layout-source";

const KIND_OF: ReadonlyMap<string, AppletLayoutKind> = new Map(
  (Object.entries(LAYOUT_COMPONENTS) as [AppletLayoutKind, string][]).map(([kind, name]) => [name, kind]),
);

/** "Not a plain value": the expression needs code to know. */
const DYNAMIC = Symbol("dynamic");
type Value = string | number | boolean | null | Value[] | { [key: string]: Value };

function valueOf(node: t.Node | null | undefined, consts: ReadonlyMap<string, Value>): Value | typeof DYNAMIC {
  if (!node) return DYNAMIC;
  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return node.value;
    case "NullLiteral":
      return null;
    case "TemplateLiteral":
      return node.expressions.length === 0 ? node.quasis.map((q) => q.value.cooked ?? q.value.raw).join("") : DYNAMIC;
    case "Identifier":
      return consts.has(node.name) ? consts.get(node.name)! : DYNAMIC;
    case "TSAsExpression":
    case "TSSatisfiesExpression":
      return valueOf(node.expression, consts);
    case "ArrayExpression": {
      const out: Value[] = [];
      for (const el of node.elements) {
        const v = el && el.type !== "SpreadElement" ? valueOf(el, consts) : DYNAMIC;
        if (v === DYNAMIC) return DYNAMIC;
        out.push(v);
      }
      return out;
    }
    case "ObjectExpression": {
      const out: { [key: string]: Value } = {};
      for (const p of node.properties) {
        if (p.type !== "ObjectProperty" || p.computed) return DYNAMIC;
        const key = p.key.type === "Identifier" ? p.key.name : p.key.type === "StringLiteral" ? p.key.value : null;
        if (key === null) return DYNAMIC;
        const v = valueOf(p.value, consts);
        if (v === DYNAMIC) return DYNAMIC;
        out[key] = v;
      }
      return out;
    }
    default:
      return DYNAMIC;
  }
}

function attrValue(attr: t.JSXAttribute, consts: ReadonlyMap<string, Value>): Value | typeof DYNAMIC {
  const v = attr.value;
  if (!v) return true;
  if (v.type === "StringLiteral") return v.value;
  if (v.type === "JSXExpressionContainer" && v.expression.type !== "JSXEmptyExpression") return valueOf(v.expression, consts);
  return DYNAMIC;
}

/** The one element `App` returns, when its body is exactly `return <X … />;`. */
function returnedElement(fn: t.FunctionDeclaration): t.JSXElement | null {
  const body = fn.body.body;
  if (fn.params.length || fn.async || fn.generator || body.length !== 1 || body[0]!.type !== "ReturnStatement") return null;
  const arg = body[0].argument;
  return arg?.type === "JSXElement" ? arg : null;
}

/** The stock layout an entry file renders and nothing else, read statically; null when it is code. */
export function layoutFromSource(name: string, source: string): AppletLayout | null {
  const parsed = parseAppletFile({ name, source });
  if (!parsed.ok || !parsed.ast) return null;
  const consts = new Map<string, Value>();
  let element: t.JSXElement | null = null;
  for (const stmt of parsed.ast.program.body) {
    if (stmt.type === "ImportDeclaration") {
      if (stmt.source.value !== "@ai-matrx/applets/react") return null;
      continue;
    }
    if (stmt.type === "VariableDeclaration" && stmt.kind === "const") {
      for (const d of stmt.declarations) {
        if (d.id.type !== "Identifier") return null;
        const v = valueOf(d.init, consts);
        if (v === DYNAMIC) return null;
        consts.set(d.id.name, v);
      }
      continue;
    }
    if (stmt.type === "ExportDefaultDeclaration" && stmt.declaration.type === "FunctionDeclaration" && !element) {
      element = returnedElement(stmt.declaration);
      if (!element) return null;
      continue;
    }
    return null;
  }
  if (!element || element.children.some((c) => !(c.type === "JSXText" && !c.value.trim()))) return null;
  const opening = element.openingElement;
  if (opening.name.type !== "JSXIdentifier") return null;
  const attrs = new Map<string, Value>();
  for (const a of opening.attributes) {
    if (a.type !== "JSXAttribute" || a.name.type !== "JSXIdentifier") return null;
    const v = attrValue(a, consts);
    if (v === DYNAMIC) return null;
    attrs.set(a.name.name, v);
  }
  const component = opening.name.name;
  let raw: Value;
  if (component === "StockLayout") {
    if (attrs.size !== 1 || !attrs.has("layout")) return null;
    raw = attrs.get("layout")!;
  } else {
    const kind = KIND_OF.get(component);
    const job = attrs.get("job");
    if (!kind || typeof job !== "string" || [...attrs.keys()].some((k) => k !== "job" && k !== "options")) return null;
    raw = { kind, job, ...(attrs.has("options") ? { options: attrs.get("options")! } : {}) };
  }
  const layout = layoutOf(raw);
  return layout && !("unknown" in layout) ? layout : null;
}

/**
 * The layout a builder answer still is: one entry file that only renders a stock layout over one of its
 * jobs, reading no data. Null when the answer is a code Applet (its code is saved as code).
 */
export function layoutFromAnswer(
  applet: Pick<BuilderApplet, "entry" | "files" | "sources" | "mandates">,
  current: Pick<BuilderApplet, "files"> | null = null,
): AppletLayout | null {
  if (applet.files.length !== 1 || applet.files[0]!.name !== applet.entry || applet.sources.length) return null;
  // A file answered "(unchanged…)" is the stored one (the same rule as the save's merge).
  const answered = applet.files[0]!.source;
  const source = /^\(unchanged/i.test(answered.trim()) ? current?.files.find((f) => f.name === applet.entry)?.source : answered;
  if (source === undefined) return null;
  const layout = layoutFromSource(applet.entry, source);
  return layout && applet.mandates.some((m) => m.alias === layout.job) ? layout : null;
}
