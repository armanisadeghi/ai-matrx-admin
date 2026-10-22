#!/usr/bin/env npx tsx
/**
 * THE GOOGLE CHAT SWITCH TAKES OUT TOOLS THAT EXIST (defect K, round 2).
 *
 * The + menu's Google row switches Google off in a chat by putting its tool names in the chat's
 * removed tools (`GOOGLE_CHAT_TOOL_NAMES` in `features/connectors/google-chat-connector.ts`). The
 * names are the SERVER's: two tool definitions (`google_workspace`, `google_email_send`) and the
 * surface bundle `google` (which reaches a chat as `bundle:list_google`). If the server renames or
 * removes one, the switch silently stops removing it — Google stays on in a chat that shows it off.
 *
 * This reads the live registry (`tool.definition`, `tool.bundle`) and fails when a name is not there.
 * UNMEASURED IS NOT PASSED: no database credentials is a failure with --strict, a loud warning
 * without. The offline half (the server's source declares the same names) is
 * `features/connectors/__tests__/google-chat-tool-names-are-the-servers.test.ts`.
 *
 *   pnpm check:google-chat-tools            # loud, exit 0
 *   pnpm check:google-chat-tools:strict     # exit 1 on any missing name or an unmeasured run
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDbEnv } from "./lib/direct-db";
import { withGateDb } from "./lib/gate-db";
import { exitAfterDrain } from "./lib/exit-after-drain";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");

/**
 * The names, read from the source file rather than imported: importing the connector pulls in the
 * whole app's environment validation, which a registry check has no business needing.
 */
export function googleChatToolNames(source: string): string[] {
  const block = /GOOGLE_CHAT_TOOL_NAMES\s*=\s*\[([^\]]*)\]/.exec(source)?.[1] ?? "";
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1] ?? "").filter(Boolean);
}
const GOOGLE_CHAT_TOOL_NAMES = googleChatToolNames(readFileSync(resolve(ROOT, "features/connectors/google-chat-connector.ts"), "utf8"));
const C = { r: "\x1b[31m", g: "\x1b[32m", y: "\x1b[33m", x: "\x1b[0m" };

/** `bundle:list_google` is the chat's name for the bundle row called `google`. */
const BUNDLE_PREFIX = "bundle:list_";

async function main(): Promise<number> {
  if (GOOGLE_CHAT_TOOL_NAMES.length === 0) {
    console.log(`${C.r}FAIL${C.x} GOOGLE_CHAT_TOOL_NAMES could not be read from features/connectors/google-chat-connector.ts — a check that measures nothing is not a pass.`);
    return 1;
  }
  const env = loadDbEnv();
  if ("missing" in env) {
    console.log(
      `${STRICT ? C.r : C.y}${STRICT ? "FAIL" : "WARN"}${C.x} LIVE PULL FAILED — the registry could not be MEASURED (no ${env.missing.join(", ")}). Unmeasured is not passed.`,
    );
    return STRICT ? 1 : 0;
  }
  const tools = GOOGLE_CHAT_TOOL_NAMES.filter((name) => !name.startsWith(BUNDLE_PREFIX));
  const bundles = GOOGLE_CHAT_TOOL_NAMES.filter((name) => name.startsWith(BUNDLE_PREFIX)).map((name) => name.slice(BUNDLE_PREFIX.length));
  const live = await withGateDb(env, { gate: "check:google-chat-tools" }, async (db) => {
    const definitions = await db.query("select name from tool.definition where name = any($1) and deleted_at is null", [tools]);
    const bundleRows = await db.query("select name from tool.bundle where name = any($1) and deleted_at is null", [bundles]);
    return { definitions: new Set(definitions.rows.map((r) => r.name as string)), bundles: new Set(bundleRows.rows.map((r) => r.name as string)) };
  });
  const missing = [
    ...tools.filter((name) => !live.definitions.has(name)).map((name) => `tool ${name}`),
    ...bundles.filter((name) => !live.bundles.has(name)).map((name) => `bundle ${name} (${BUNDLE_PREFIX}${name})`),
  ];
  if (missing.length === 0) {
    console.log(`${C.g}OK${C.x}   every name the Google chat switch removes exists in the live tool registry (${GOOGLE_CHAT_TOOL_NAMES.join(", ")}).`);
    return 0;
  }
  console.log(
    `${C.r}FAIL${C.x} the Google chat switch removes names the server no longer has: ${missing.join("; ")}.\n` +
      `     Update GOOGLE_CHAT_TOOL_NAMES in features/connectors/google-chat-connector.ts to the server's names, or the switch silently does nothing.`,
  );
  return STRICT ? 1 : 0;
}

main().then(
  (code) => exitAfterDrain(code),
  (error) => {
    console.error(`${C.r}FAIL${C.x} could not measure:`, error instanceof Error ? error.message : error);
    exitAfterDrain(STRICT ? 1 : 0);
  },
);
