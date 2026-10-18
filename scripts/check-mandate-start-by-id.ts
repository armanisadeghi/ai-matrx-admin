#!/usr/bin/env npx tsx
/**
 * check:mandate-start-by-id — a run whose agent came FROM a mandate must start
 * THROUGH that mandate.
 *
 * 🚨 THE RULE ("nothing bypasses mandates", 2026-10-18 census): code that
 * resolves a mandate in the browser (`resolveMandate`, `resolveMandateAsking`,
 * `useMandate`, …) and then starts the run with only the resolved `agentId`
 * POSTs `/ai/agents/{id}`. The server never sees the job: no ladder, no
 * provision, no `mandate_key` on the row, so run history and spend-by-mandate
 * miss it, and a rebind cannot take effect. The fix is one property: pass
 * `mandateKey` beside `agentId` (the id stays the display identity) so the
 * start goes to `/ai/mandates/{key}`.
 *
 * WHAT IT FLAGS: a call to a run-start entry point (`createManualInstance`,
 * `launchAgentExecution`, `launchAgent`, `startAgentRun`) where the agent id
 * is `<x>.agentId` and `<x>` was assigned from a mandate resolution in the same
 * file, and the call carries no `mandateKey`.
 *
 * NOT A BYPASS (never flagged): a person running the agent THEY chose on the
 * run-an-agent pages (`app/(core)/agents/[id]/run`, the admin system-agents run
 * page) — those ids come from the route, not from a mandate.
 *
 *   pnpm check:mandate-start-by-id               # exit 1 on any finding
 *   pnpm check:mandate-start-by-id --self-test   # proves RED on the old shape, GREEN on the fix
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components", "features", "hooks", "lib", "utils", "../aidream/apps/shared/chat/src"];
const START_CALLS = new Set(["createManualInstance", "launchAgentExecution", "launchAgent", "startAgentRun"]);
const MANDATE_RESOLVER_RE = /^(resolveMandate\w*|useMandate\w*|fetchMandate\w*|resolve\w*Mandate\w*)$/;
const EXEMPT_PATHS = [/app\/\(core\)\/agents\/\[id\]\/run\//, /system-agents\/agents\/\[id\]\/run\//];

export interface Finding {
  file: string;
  line: number;
  call: string;
  text: string;
}

function calleeName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  while (ts.isAwaitExpression(e) || ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) {
    e = e.expression;
  }
  // `(await dispatch(resolveX(...))).unwrap()` / `.then(...)` — look through to the inner call
  return e;
}

/** Names bound (in this file) to a mandate resolution: `const m = await resolveMandate(K)`. */
function mandateBoundNames(sf: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const callsResolver = (node: ts.Node): boolean => {
    let found = false;
    const visit = (n: ts.Node): void => {
      if (found) return;
      if (ts.isCallExpression(n)) {
        const name = calleeName(n.expression);
        if (name && MANDATE_RESOLVER_RE.test(name)) {
          found = true;
          return;
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
    return found;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer && callsResolver(unwrap(node.initializer))) {
      if (ts.isIdentifier(node.name)) names.add(node.name.text);
      else if (ts.isObjectBindingPattern(node.name)) {
        for (const el of node.name.elements) {
          const prop = el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName.text : null;
          if (ts.isIdentifier(el.name) && (prop === "agentId" || el.name.text === "agentId")) {
            names.add(`=${el.name.text}`); // a destructured agentId itself
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
}

function isMandateAgentId(expr: ts.Expression, bound: Set<string>): boolean {
  const e = unwrap(expr);
  if (ts.isIdentifier(e)) return bound.has(`=${e.text}`);
  if (ts.isPropertyAccessExpression(e) && e.name.text === "agentId") {
    const target = unwrap(e.expression);
    return ts.isIdentifier(target) && bound.has(target.text);
  }
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    return isMandateAgentId(e.left, bound);
  }
  return false;
}

function objectHasKey(obj: ts.ObjectLiteralExpression, key: string): boolean {
  return obj.properties.some(
    (p) =>
      ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
        p.name !== undefined &&
        ts.isIdentifier(p.name) &&
        p.name.text === key) ||
      ts.isSpreadAssignment(p), // a spread may carry it; never guess
  );
}

export function scanSource(source: string, file: string): Finding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const bound = mandateBoundNames(sf);
  if (bound.size === 0) return [];
  const findings: Finding[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = calleeName(node.expression);
      if (name && START_CALLS.has(name)) {
        const objs = node.arguments.filter(ts.isObjectLiteralExpression);
        let byMandateId = false;
        // launchAgent(m.agentId, {...}) / startAgentRun(t, m.agentId, req)
        if (node.arguments.some((a) => isMandateAgentId(a, bound))) byMandateId = true;
        for (const o of objs) {
          for (const p of o.properties) {
            if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "agentId" && isMandateAgentId(p.initializer, bound)) {
              byMandateId = true;
            }
            if (ts.isShorthandPropertyAssignment(p) && p.name.text === "agentId" && bound.has("=agentId")) byMandateId = true;
          }
        }
        if (byMandateId && !objs.some((o) => objectHasKey(o, "mandateKey"))) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          findings.push({ file, line: line + 1, call: name, text: node.getText(sf).split("\n")[0].trim() });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".next" || name === "__tests__" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith(".d.ts")) out.push(full);
  }
}

export function census(): Finding[] {
  const files: string[] = [];
  for (const d of SCAN_DIRS) walk(path.resolve(ROOT, d), files);
  const findings: Finding[] = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    if (EXEMPT_PATHS.some((re) => re.test(rel))) continue;
    const src = readFileSync(f, "utf8");
    if (!/Mandate/.test(src)) continue;
    findings.push(...scanSource(src, rel));
  }
  return findings;
}

function selfTest(): number {
  // The recorded shape (war-room thread, 2026-10-18) — must be RED.
  const before = `
    const threadMandate = await resolveMandate(WAR_ROOM_THREAD_AGENT_MANDATE);
    await dispatch(createManualInstance({ agentId: threadMandate.agentId, apiEndpointMode: "agent" })).unwrap();
    const { agentId } = await resolveMandateAsking(K);
    launchAgent(agentId, { surfaceKey: "x" });
  `;
  const after = `
    const threadMandate = await resolveMandate(WAR_ROOM_THREAD_AGENT_MANDATE);
    await dispatch(createManualInstance({ agentId: threadMandate.agentId, mandateKey: WAR_ROOM_THREAD_AGENT_MANDATE })).unwrap();
    const picked = params.id;
    launchAgent(picked, { surfaceKey: "x" });
  `;
  const red = scanSource(before, "before.ts");
  const green = scanSource(after, "after.ts");
  const ok = red.length === 2 && green.length === 0;
  console.log(`self-test: old shape ${red.length} finding(s) (want 2), fixed shape ${green.length} (want 0) -> ${ok ? "PASS" : "FAIL"}`);
  return ok ? 0 : 1;
}

if (require.main === module) {
  if (process.argv.includes("--self-test")) process.exit(selfTest());
  const findings = census();
  for (const f of findings) {
    console.log(`${f.file}:${f.line}  ${f.call}(...) starts a mandate-resolved agent BY ID — add mandateKey  | ${f.text}`);
  }
  console.log(
    findings.length
      ? `\ncheck:mandate-start-by-id: ${findings.length} start(s) bypass their mandate. Pass mandateKey beside agentId.`
      : "check:mandate-start-by-id: every mandate-resolved start goes through its mandate.",
  );
  process.exit(findings.length ? 1 : 0);
}
