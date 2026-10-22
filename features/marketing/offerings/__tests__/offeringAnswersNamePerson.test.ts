/**
 * Every Products & services answer names the person (REVIEW2 I3, 2026-10-22).
 *
 * Keep / No / clear wrote `web.discovered_item.status` without `reviewed_at` / `reviewed_by`, so a person's Yes never
 * made an offering person-validated (aidream `person_validated_offerings` reads `reviewed_by`) and a No never withdrew
 * the AI stances filed for it (`web._offering_no_withdraws_stances` acts only on an answer that names its person).
 * Every `.from("discovered_item").update({...})` in the offerings writers must set BOTH `reviewed_at` and
 * `reviewed_by` (a person via `signedInPersonId`, or `null` together when the answer is cleared).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const DATA = join(__dirname, "..", "data.ts");

function fromTable(call: ts.CallExpression): string | null {
  let node: ts.Expression = call.expression;
  while (ts.isPropertyAccessExpression(node) || ts.isCallExpression(node)) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === "from" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      return node.arguments[0].text;
    }
    node = ts.isCallExpression(node) ? node.expression : node.expression;
  }
  return null;
}

function keys(obj: ts.ObjectLiteralExpression): Map<string, ts.Expression> {
  const out = new Map<string, ts.Expression>();
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) out.set(p.name.text, p.initializer);
  }
  return out;
}

export function unnamedAnswers(text: string): string[] {
  const sf = ts.createSourceFile("data.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === "update" && fromTable(node) === "discovered_item") {
      const arg = node.arguments[0];
      const k = arg && ts.isObjectLiteralExpression(arg) ? keys(arg) : new Map<string, ts.Expression>();
      const at = k.get("reviewed_at");
      const by = k.get("reviewed_by");
      const isNull = (e?: ts.Expression) => e?.kind === ts.SyntaxKind.NullKeyword;
      const ok = at && by && (isNull(at) === isNull(by));
      if (!ok) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
        found.push(`data.ts:${line + 1} answers without naming the person (reviewed_at + reviewed_by)`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe("Products & services answers name the person", () => {
  it("catches an answer with no person (the guard can fail)", () => {
    const bad = `supabase.schema("web").from("discovered_item").update({ status: "dismissed" }).in("id", ids);
      supabase.schema("web").from("discovered_item").update({ status: "confirmed", reviewed_at: now }).in("id", ids);
      supabase.schema("web").from("discovered_item").update({ status: "pending", reviewed_at: null, reviewed_by: me });`;
    expect(unnamedAnswers(bad)).toHaveLength(3);
    const good = `supabase.schema("web").from("discovered_item").update({ status: "dismissed", reviewed_at: now, reviewed_by: me });
      supabase.schema("web").from("discovered_item").update({ status: "pending", reviewed_at: null, reviewed_by: null });
      supabase.schema("web").from("brand_offering").update({ status: "retired" });`;
    expect(unnamedAnswers(good)).toEqual([]);
  });

  it("keep, No and clear in offerings/data.ts all name the person", () => {
    expect(unnamedAnswers(readFileSync(DATA, "utf8"))).toEqual([]);
  });
});
