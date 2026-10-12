#!/usr/bin/env npx tsx
/**
 * Every kind a screen mounts "Linked records" for must be a kind the platform lets a record link to.
 *
 * WHY: `EntityCustomFields` / `EntityBackLinks` ask `custom.entity_back_links(<kind>, <id>)`, which refuses
 * (22023) any kind `custom.entity_reference_kinds()` does not list - the registered `record -> <kind>` association
 * types. A page for an unregistered kind used to show a red "Couldn't read linked records" (web_page, 2026-10-12).
 * The component now degrades to nothing (a badge into the entity registry for a super admin), but a developer
 * adding a mount for a new kind must register it in the same change. This finds the ones that did not.
 *
 *   pnpm check:back-link-kinds           # loud, exit 0
 *   pnpm check:back-link-kinds:strict    # exit 1 on a finding OR when the live registry could not be read
 *
 * Scope: literal `entityToken="x"` on <EntityCustomFields|EntityBackLinks>. Tokens passed from a variable are
 * handled at run time by the component (unlinkable -> absent). Kinds linked another way are listed in
 * LINKED_ANOTHER_WAY (the same set the component skips).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { connectDirect, loadDbEnv } from "./lib/direct-db";
import { exitAfterDrain } from "./lib/exit-after-drain";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");
const LINKED_ANOTHER_WAY = new Set(["file", "user", "person", "user_profile", "record", "custom_record"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "migrations", "tmp", ".wt", "__tests__"]);
const TAG = /<(EntityCustomFields|EntityBackLinks)\b([\s\S]*?)\/>/g;
const TOKEN = /\bentityToken="([a-z0-9_]+)"/;

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) yield p;
  }
}

function mounts(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of walk(ROOT)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(TAG)) {
      const token = TOKEN.exec(m[2]!)?.[1];
      // A mount that opts out (`backLinks={false}`) asks nothing of the registry.
      if (!token || /\bbackLinks=\{false\}/.test(m[2]!)) continue;
      const list = found.get(token) ?? [];
      list.push(relative(ROOT, file));
      found.set(token, list);
    }
  }
  return found;
}

async function main(): Promise<number> {
  const asked = mounts();
  const env = loadDbEnv();
  if ("missing" in env) {
    console.log(`LIVE PULL FAILED: UNMEASURED - no database connection (${env.missing.join(", ")}). ${asked.size} kinds mounted, none checked.`);
    return STRICT ? 1 : 0;
  }
  const client = await connectDirect(env, "check-back-link-kinds");
  try {
    const { rows } = await client.query<{ token: string }>("select token from custom.entity_reference_kinds()");
    const linkable = new Set(rows.map((r) => r.token));
    const bad = [...asked].filter(([token]) => !linkable.has(token) && !LINKED_ANOTHER_WAY.has(token));
    for (const [token, files] of bad) {
      console.log(
        `NOT LINKABLE  ${token}  mounted in ${files.join(", ")}\n  fix: add a record -> ${token} rule (admin: /administration/database/relationships/rules), or mount with backLinks={false}`,
      );
    }
    console.log(`${asked.size} mounted kinds checked, ${bad.length} not linkable.`);
    return bad.length && STRICT ? 1 : 0;
  } finally {
    await client.end();
  }
}

main().then(
  (code) => exitAfterDrain(code),
  (e) => {
    console.error(e);
    exitAfterDrain(2);
  },
);
