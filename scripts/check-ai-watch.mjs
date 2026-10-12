#!/usr/bin/env node
/**
 * check:ai-watch — no AI run starts outside the watchable path.
 *
 * Contract: common-docs/systems/architecture/execution-runtime/AI-WATCH.md.
 * A model run is watchable when it starts through the execution system in
 * @ai-matrx/chat (it gets an `activeRequests` row the Watch AI window binds to,
 * and the server's `chat.user_request` record it reopens from). Code that calls
 * an agent-turn endpoint itself (`callApi({ path: "/ai/agents/{id}" })`, a raw
 * `fetch`/`requestRaw`/`stream` on `/ai/...`) starts a run no viewer can see.
 *
 * This scans the frontend and the shared packages for string literals naming
 * an agent-turn door outside the execution system. Each allowed exception sits
 * in ALLOWED with its reason; an entry that no longer matches fails too.
 *
 *   node scripts/check-ai-watch.mjs            # scan
 *   node scripts/check-ai-watch.mjs --self-test
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHARED = path.resolve(ROOT, "../aidream/apps/shared");

/** The doors that start a model turn (the agent-turn group of paidAiPaths.ts), params as {x}. */
export const RUN_DOORS = new Set([
  "/ai/agents/{x}",
  "/ai/agent/{x}",
  "/ai/agents-blocks/{x}",
  "/ai/conversations/{x}",
  "/ai/conversation/{x}",
  "/ai/conversations/{x}/fork-and-run",
  "/ai/conversation/{x}/fork-and-run",
  "/ai/manual",
  "/ai/chat",
  "/ai/chat/direct-chat",
  "/ai/chat/prompt-execution",
  "/ai/prompts/{x}",
  "/ai/mandates/{x}",
  // A door built by concatenation: "/ai/mandates/" + key
  "/ai/mandates/",
  "/ai/agents/",
  "/ai/conversations/",
]);

/** Where starting a run IS the watchable path. */
const WATCHABLE_HOMES = [
  "chat/src/agents/redux/execution-system/",
  "chat/src/agents/runtime-reconnect/",
  // The server contract (generated path types and the protocol table), not callers.
  "api/src/",
];

/** Known exceptions — path suffix → reason. */
const ALLOWED = {
  "features/entitlements/usage-gate/paidAiPaths.ts": "the census of paid doors, not a call",
  "features/agents/components/model-view/requestModelView.ts": "dry_run: builds the provider request, sends nothing to a model",
  "features/data-sources/lab/labServer.ts": "data-to-model lab: dry runs, and its live call is the lab's own watched bench",
  "lib/api/call-api.ts": "doc comment examples",
  "app/(dev)/demos/api-tests/matrx-ai/agent-demo/AgentDemoClient.tsx": "dev raw-API explorer (demos site only)",
  "app/(dev)/demos/api-tests/matrx-ai/conversation-demo/ConversationDemoClient.tsx": "dev raw-API explorer (demos site only)",
  "app/(dev)/demos/api-tests/matrx-ai/dynamic-api/DynamicApiClient.tsx": "dev raw-API explorer (demos site only)",
  "app/(dev)/demos/local-tools/chat/page.dev.tsx": "dev local-tools demo (demos site only)",
  // PRE-EXISTING, shrink-only: move onto the execution system, then delete the row.
  "chat/src/host/defaults/server-api.ts": "pre-existing: fork-and-run host door; its callers must adopt the stream",
};

/** A file that hands its stream to the execution system is on the watchable path. */
const ADOPTERS = /\b(adoptForeignStream|processStream|executeInstance|launchConversation|runHeadlessAgentJson)\b/;

const SCAN_DIRS = ["features", "components", "lib", "app", "hooks", "utils", "providers"];
const EXT = /\.(ts|tsx|mjs|js)$/;
const SKIP = /(__tests__|\.test\.|\.spec\.|node_modules|\/dist\/|\.d\.ts$)/;

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** Literal strings in code that name a run door. */
export function findRunDoorLiterals(src) {
  const code = stripComments(src);
  const hits = [];
  const re = /(["'`])(\/(?:v2\/)?ai\/[^"'`\s]*)\1|`(\/(?:v2\/)?ai\/[^`]*)`/g;
  let m;
  while ((m = re.exec(code))) {
    const lit = (m[2] ?? m[3] ?? "")
      .replace(/^\/v2/, "")
      .replace(/\$\{[^}]*\}?|\{[^}]*\}/g, "{x}")
      .replace(/\?.*$/, "");
    if (RUN_DOORS.has(lit)) hits.push(lit);
  }
  return hits;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
      walk(p, out);
    } else if (EXT.test(e.name) && !SKIP.test(p)) out.push(p);
  }
  return out;
}

function scan() {
  const files = [
    ...SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d))),
    ...(fs.existsSync(SHARED)
      ? fs.readdirSync(SHARED).flatMap((pkg) => walk(path.join(SHARED, pkg, "src")))
      : []),
  ];
  const findings = [];
  const usedAllow = new Set();
  for (const file of files) {
    const rel = file.startsWith(SHARED) ? path.relative(SHARED, file) : path.relative(ROOT, file);
    if (WATCHABLE_HOMES.some((h) => rel.startsWith(h))) continue;
    const src = fs.readFileSync(file, "utf8");
    const hits = findRunDoorLiterals(src);
    if (!hits.length || ADOPTERS.test(stripComments(src))) continue;
    const allow = Object.keys(ALLOWED).find((k) => rel.endsWith(k));
    if (allow) {
      usedAllow.add(allow);
      continue;
    }
    findings.push(`${rel}: starts an AI run outside the watchable path (${[...new Set(hits)].join(", ")})`);
  }
  for (const k of Object.keys(ALLOWED)) {
    if (!usedAllow.has(k)) findings.push(`ALLOWED entry no longer matches anything — remove it: ${k}`);
  }
  return { files: files.length, findings };
}

function selfTest() {
  const bad = `dispatch(callApi({ path: "/ai/agents/{agent_id}", method: "POST" }));`;
  const bad2 = "await requestRaw(`/ai/conversations/${id}`, { method: 'POST' });";
  const good = `dispatch(executeInstance({ conversationId })); // calls /ai/agents/{id} inside`;
  const other = `callApi({ path: "/ai/models", method: "GET" })`;
  const ok =
    findRunDoorLiterals(bad).length === 1 &&
    findRunDoorLiterals(bad2).length === 1 &&
    findRunDoorLiterals(good).length === 0 &&
    findRunDoorLiterals(other).length === 0;
  if (!ok) {
    console.error("check:ai-watch self-test FAILED");
    process.exit(1);
  }
  console.log("check:ai-watch self-test OK (flags direct run doors, ignores comments and non-run paths)");
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const { files, findings } = scan();
  if (findings.length) {
    console.error(`check:ai-watch — ${findings.length} finding(s) over ${files} files:`);
    for (const f of findings) console.error(`  ${f}`);
    console.error("Start runs through the execution system (or adoptForeignStream) so Watch AI can see them.");
    process.exit(1);
  }
  console.log(`check:ai-watch OK — ${files} files, every AI run starts on the watchable path.`);
}
