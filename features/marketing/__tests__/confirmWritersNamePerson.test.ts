/**
 * Every confirm writer names the person (single-source plan § 2.2 "Guards on the confirmation record").
 *
 * A write that sets `reviewed_at` (web.discovered_item) or `confirmed_at` (web.business_fact, web.brand_asset)
 * to a value must also set `reviewed_by` / `confirmed_by` in the same object (or an object it is spread into).
 * Clearing (`null`) needs no person. The database fills a signed-in person's own write and refuses everyone
 * else's (`web._fact_person_confirms`, `web._finding_person_reviews`); this test keeps the code honest so the
 * backfill and the standings read who answered from the row, never from a guess.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = join(__dirname, "..");
const PAIRS: Record<string, string> = { reviewed_at: "reviewed_by", confirmed_at: "confirmed_by" };

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(path);
    }
  }
  return out;
}

function propName(p: ts.ObjectLiteralElementLike): string | null {
  if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) return null;
  const n = p.name;
  return ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : null;
}

/** The object literal and every object literal it is spread into (`...(cond ? { a } : {})`). */
function enclosingObjects(obj: ts.ObjectLiteralExpression): ts.ObjectLiteralExpression[] {
  const chain = [obj];
  let node: ts.Node = obj;
  while (node.parent) {
    node = node.parent;
    if (ts.isObjectLiteralExpression(node) && isWrite(node)) {
      chain.push(node);
      continue;
    }
    if (ts.isSpreadAssignment(node) || ts.isParenthesizedExpression(node) || ts.isConditionalExpression(node)
      || ts.isBinaryExpression(node)) continue;
    break;
  }
  return chain;
}

const WRITE_CALLS = new Set(["insert", "update", "upsert"]);

/** A row being WRITTEN: inside the argument of `.insert/.update/.upsert(...)`, or a `patch` handed to a service. */
function isWrite(obj: ts.ObjectLiteralExpression): boolean {
  let node: ts.Node = obj;
  while (node.parent) {
    const parent: ts.Node = node.parent;
    if (ts.isCallExpression(parent) && parent.arguments.some((a) => a === node)
      && ts.isPropertyAccessExpression(parent.expression) && WRITE_CALLS.has(parent.expression.name.text)) return true;
    if ((ts.isPropertyAssignment(parent) || ts.isVariableDeclaration(parent)) && parent.initializer === node
      && ts.isIdentifier(parent.name) && parent.name.text === "patch") return true;
    node = parent;
  }
  return false;
}

export function unnamedConfirmWrites(file: string, text: string): string[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node) && isWrite(node)) {
      for (const p of node.properties) {
        const name = propName(p);
        if (!name || !(name in PAIRS)) continue;
        if (ts.isPropertyAssignment(p) && p.initializer.kind === ts.SyntaxKind.NullKeyword) continue;
        const partner = PAIRS[name];
        const named = enclosingObjects(node).some((o) => o.properties.some((q) => propName(q) === partner));
        if (!named) {
          const { line } = sf.getLineAndCharacterOfPosition(p.getStart());
          found.push(`${relative(ROOT, file)}:${line + 1} sets ${name} without ${partner}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe("confirm writers name the person", () => {
  it("catches a confirm write with no person (the guard can fail)", () => {
    const bad = `db.from("discovered_item").update({ status: "confirmed", reviewed_at: now });
      db.from("business_fact").insert(rows.map((r) => ({ ...(ok ? { confirmed_at: now } : {}) })));
      const patch = { confirmed_at: at };`;
    expect(unnamedConfirmWrites("x.ts", bad)).toHaveLength(3);
    const good = `db.from("discovered_item").update({ status: "confirmed", reviewed_at: now, reviewed_by: me });
      db.from("business_fact").insert({ confirmed_by: me, ...(ok ? { confirmed_at: now } : {}) });
      db.from("discovered_item").update({ status: "pending", reviewed_at: null, reviewed_by: null });
      const shown = { reviewed_at: row.reviewed_at };`;
    expect(unnamedConfirmWrites("x.ts", good)).toEqual([]);
  });

  it("every marketing confirm writer sets reviewed_by / confirmed_by", () => {
    const offenders = sourceFiles(ROOT).flatMap((f) => unnamedConfirmWrites(f, readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
