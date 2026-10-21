#!/usr/bin/env node
/**
 * G2 — THE WEB'S MESSAGE-ACTION RATCHET (message-actions move, plan G2).
 *
 * The "⋯" message actions are moving from this app into @ai-matrx/chat, one wave at a time, so the
 * web chat and Matrx 2 render the same menu with no fork left here. This keeps the move one-way:
 *
 *   1. no handler under features/rich-document/actions/handlers registers an id the package
 *      registers (CHAT_MESSAGE_ACTION_IDS) — a moved action leaves this app in the same push;
 *   2. every id this app registers is in the ratchet file — no NEW web-only action;
 *   3. every id in the ratchet file is still registered here — the file only shrinks (delete the
 *      line in the commit that moves the action);
 *   4. the "staysWeb" list is exactly the web-only contexts (plan D8, plus the annotation sidecar's comment-selection). The move is done when
 *      "awaitingMove" is empty.
 *
 *   node scripts/check-rich-document-action-ratchet.mjs              # red on any breach
 *   node scripts/check-rich-document-action-ratchet.mjs --print      # the ids this app registers
 *   node scripts/check-rich-document-action-ratchet.mjs --self-test  # proves each rule can go red
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HANDLERS = join(ROOT, "features/rich-document/actions/handlers");
const RATCHET = join(ROOT, "features/rich-document/actions/web-action-ratchet.json");
const REGISTER_MODULE = "@ai-matrx/chat/agents/components/messages-display/rich-document/actions/register";
const REGISTER_CALLS = new Set(["registerActionIfAbsent", "registerAction"]);
// "comment-selection" (review 4 F12, 2026-10-20) joins "notes-and-comments": both drive the web-only annotation sidecar.
export const STAYS_WEB = ["notes-and-comments", "comment-selection", "apply-to-source", "attach-artifact-to-chat", "code-block-apply-to-file"];

const ts = createRequire(join(ROOT, "package.json"))("typescript");

/** Every action id a handler file registers (a computed id reads as `<file>:<expression>`). */
export function idsInSource(fileName, text) {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const ids = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && REGISTER_CALLS.has(node.expression.text)) {
      const arg = node.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        const idProp = arg.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(source) === "id");
        if (idProp) {
          const init = idProp.initializer;
          ids.push(ts.isStringLiteralLike(init) ? init.text : `${fileName}:${init.getText(source)}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return ids;
}

export function webIds(dir = HANDLERS) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "register-if-absent.ts")
    .flatMap((f) => idsInSource(f, readFileSync(join(dir, f), "utf8")));
}

/** The ids @ai-matrx/chat registers, read from the INSTALLED package's register module. */
export async function packageIds() {
  try {
    const mod = await import(REGISTER_MODULE);
    if (Array.isArray(mod.CHAT_MESSAGE_ACTION_IDS)) return [...mod.CHAT_MESSAGE_ACTION_IDS];
  } catch {
    /* the module graph needs a bundler; read the file instead */
  }
  let file;
  try {
    file = fileURLToPath(import.meta.resolve(REGISTER_MODULE));
  } catch {
    throw new Error(
      `The installed @ai-matrx/chat has no ${REGISTER_MODULE.slice("@ai-matrx/chat/".length)} — it predates the move. ` +
        "Run `pnpm sync:matrx-packages`.",
    );
  }
  // The register module lists its own rows and spreads the descriptor modules it imports
  // (./descriptors/* and the wave modules ./register-w2a, -w2b, -w3c …): read each, in import
  // order, the way the list is assembled.
  const text = readFileSync(file, "utf8");
  const own = text.slice(text.indexOf("const DIALOG_ACTIONS") >= 0 ? text.indexOf("const DIALOG_ACTIONS") : text.indexOf("CHAT_MESSAGE_ACTIONS"));
  const ids = [...own.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]);
  for (const m of text.matchAll(/from\s+"(\.\/(?:descriptors\/|register-w\d)[^"]*)"/g)) {
    const base = join(dirname(file), m[1].replace(/\.js$/, ""));
    const ext = [".js", ".ts", ""].find((e) => {
      try {
        readFileSync(base + e);
        return true;
      } catch {
        return false;
      }
    });
    if (ext === undefined) continue;
    const descriptor = readFileSync(base + ext, "utf8");
    ids.push(...[...descriptor.matchAll(/\bid:\s*"([^"]+)"/g)].map((x) => x[1]));
    // A descriptor module that maps a catalog (the conversation transfer rows) registers its ids.
    for (const c of descriptor.matchAll(/from\s+"((?:\.\.?\/)+[^"]*conversation-transfer-rows(?:\.js)?)"/g)) {
      const cat = join(dirname(base), c[1]);
      const cext = [".js", ".ts", ""].find((e) => {
        try {
          readFileSync(cat + e);
          return true;
        } catch {
          return false;
        }
      });
      if (cext !== undefined) ids.push(...[...readFileSync(cat + cext, "utf8").matchAll(/\bid:\s*"([^"]+)"/g)].map((x) => x[1]));
    }
  }
  return [...new Set(ids)];
}

/** Every breach of the four rules, as sentences. */
export function breaches({ web, pkg, ratchet }) {
  const out = [];
  const allowed = new Set([...(ratchet.staysWeb ?? []), ...(ratchet.awaitingMove ?? [])]);
  const webSet = new Set(web);
  for (const id of web) if (pkg.includes(id)) out.push(`"${id}" is registered by @ai-matrx/chat — delete the web copy`);
  for (const id of web) if (!allowed.has(id)) out.push(`"${id}" is a new web-only action — build it in @ai-matrx/chat instead`);
  for (const id of allowed) if (!webSet.has(id)) out.push(`"${id}" is no longer registered here — remove it from web-action-ratchet.json`);
  const stays = [...(ratchet.staysWeb ?? [])].sort();
  if (JSON.stringify(stays) !== JSON.stringify([...STAYS_WEB].sort())) {
    out.push(`staysWeb must be exactly ${STAYS_WEB.join(", ")} (plan D8)`);
  }
  return out;
}

function selfTest() {
  const ratchet = { staysWeb: [...STAYS_WEB], awaitingMove: ["copy"] };
  const base = { web: [...STAYS_WEB, "copy"], pkg: ["delete-message"], ratchet };
  const cases = [
    ["clean", base, 0],
    ["a package id registered here", { ...base, web: [...base.web, "delete-message"], ratchet: { ...ratchet, awaitingMove: ["copy", "delete-message"] } }, 1],
    ["a new web-only id", { ...base, web: [...base.web, "brand-new"] }, 1],
    ["a stale ratchet line", { ...base, web: [...STAYS_WEB] }, 1],
    ["a widened staysWeb", { ...base, ratchet: { ...ratchet, staysWeb: [...STAYS_WEB, "copy"], awaitingMove: [] } }, 1],
  ];
  let failed = 0;
  for (const [name, input, expected] of cases) {
    const got = breaches(input).length;
    const ok = expected === 0 ? got === 0 : got >= expected;
    if (!ok) failed += 1;
    console.log(`${ok ? "✔" : "✖"} self-test: ${name} (${got} breach(es))`);
  }
  const parsed = idsInSource("x.ts", 'registerActionIfAbsent({ id: "a" }); ROWS.forEach((row) => registerActionIfAbsent({ id: row.id }));');
  const parseOk = JSON.stringify(parsed) === JSON.stringify(["a", "x.ts:row.id"]);
  console.log(`${parseOk ? "✔" : "✖"} self-test: ids are read from literal and computed registrations`);
  if (!parseOk) failed += 1;
  process.exit(failed ? 1 : 0);
}

async function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  const web = webIds();
  if (process.argv.includes("--print")) {
    console.log(JSON.stringify(web.sort(), null, 2));
    return;
  }
  const pkg = await packageIds();
  const ratchet = JSON.parse(readFileSync(RATCHET, "utf8"));
  const found = breaches({ web, pkg, ratchet });
  if (found.length) {
    console.error(`✖ rich-document action ratchet: ${found.length} breach(es) (${relative(ROOT, RATCHET)})`);
    for (const line of found) console.error(`  - ${line}`);
    process.exit(1);
  }
  console.log(
    `✔ rich-document action ratchet: ${web.length} web registration(s), none of the package's ${pkg.length}; ` +
      `${ratchet.awaitingMove.length} awaiting the move, ${ratchet.staysWeb.length} stay web`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`✖ rich-document action ratchet: ${error.message}`);
    process.exit(1);
  });
}
