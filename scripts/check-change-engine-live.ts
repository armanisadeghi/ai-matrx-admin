#!/usr/bin/env npx tsx
/**
 * The move-and-archive engine, exercised on the live database as admin@admin.com.
 *
 * WHAT IT PROTECTS: platform.change_records (migration 20261016101000), the one door for
 * delete (archive), restore and move-to-organization of any record with relationships.
 * Plan: common-docs/systems/architecture/database/projects/move-and-archive/PLAN.md.
 *
 * HOW: each scenario in scripts/change-engine-scenarios/*.sql creates its own records, acts as
 * admin@admin.com through the `authenticated` role (the same grants a browser has), and returns
 * one `k, v` row per observation. Every scenario runs inside ONE transaction that is ALWAYS
 * rolled back: nothing it creates or changes survives, and nobody else's record is touched.
 *
 * PROVEN FAILING 2026-10-16: before the engine was applied every scenario failed (the door did
 * not exist); during the build, brand-archive-restore failed on a real bug (a brand's logo,
 * held by a (file_id, organization_id) key, was left live under the archived brand) and
 * brand-move-shared-file failed on two (the logo could not follow the brand inside one move,
 * and a logo shared with a brand that stays was silently broken). All green after the fixes.
 *
 *   pnpm check:change-engine-live            # exit 1 on any failed assertion
 *
 * Needs the five SUPABASE_MATRIX_* variables (this repo's env files, then ../aidream/.env).
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { connectDirect, loadDbEnv } from "./lib/direct-db";
import { exitAfterDrain } from "./lib/exit-after-drain";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = resolve(ROOT, "scripts", "change-engine-scenarios");
const TARGET = "ef4b0d95-5ec3-4d8f-901b-d40e178a71df";
const SOURCE = "7cd12da2-2213-4378-8fba-a9e2dc4ea657";

type Obs = Record<string, unknown>;
type J = Record<string, unknown>;
const o = (v: unknown): J => (v && typeof v === "object" ? (v as J) : {});
const arr = (v: unknown): J[] => (Array.isArray(v) ? (v as J[]) : []);

/** Each scenario's assertions: name -> predicate over the observations. */
const ASSERT: Record<string, Array<[string, (x: Obs) => boolean]>> = {
  "brand-archive-restore.sql": [
    ["delete stamps brand, asset, persona and the logo file", (x) => Object.values(o(x.after_delete)).every((v) => v === true) && Object.keys(o(x.after_delete)).length === 4],
    ["delete is one inline plan of 4 rows", (x) => o(x.commit).status === "done" && o(x.commit).rows === 4],
    ["restore by plan brings exactly those 4 back", (x) => o(x.restore).rows === 4 && Object.values(o(x.after_restore)).every((v) => v === true)],
  ],
  "note-move-scope-alarm.sql": [
    ["preview raises the scope alarm naming both case scopes", (x) => {
      const w = arr(o(x.preview).warnings).find((w) => w.kind === "scope_alarm");
      return !!w && w.count === 2 && arr(w.items).every((i) => i.type === "scope" && typeof i.title === "string");
    }],
    ["the scope question offers only detach, with don't-move as the way out and no suggestion", (x) => {
      const q = arr(o(x.preview).questions).find((q) => q.kind === "scope_link");
      return !!q && q.suggested === null && arr(q.options).map((p) => p.value).join() === "cut" && arr(q.way_out).map((p) => p.value).join() === "cancel";
    }],
    ["choosing don't-move changes nothing", (x) => o(x.cancel).status === "cancelled" && o(x.cancel).org_after_cancel === SOURCE],
    ["an unanswered question is never filled in", (x) => o(x.unanswered).status === "needs_answers"],
    ["the note moves, gets the target's General home, and its scope link is cut by the plan", (x) => {
      const a = o(x.after);
      return o(a.note).org === TARGET && o(a.note).home === x.target_general && o(a.edge).deleted === true && o(a.edge).via === "change_plan";
    }],
  ],
  "brand-move-shared-file.sql": [
    ["a logo pinned by a brand that stays is a named refusal listing that brand's asset", (x) => {
      const w = arr(o(x.preview_shared).warnings).find((w) => w.kind === "shared_file_pinned");
      return !!w && w.severity === "refuse" && arr(w.users).length === 1;
    }],
    ["committing past it is refused and nothing moves", (x) => String(x.commit_shared).startsWith("23514")],
    ["once unshared, brand, asset, persona and logo all move together", (x) => {
      const a = o(x.after);
      return o(x.commit).status === "done" && a.brand === TARGET && a.asset === TARGET && a.persona === TARGET && a.file === TARGET && a.brand2 === SOURCE;
    }],
  ],
  "contact-and-shared-file.sql": [
    ["a contact's delete takes its address", (x) => o(x.party_delete).addr_deleted === true],
    ["restore brings contact and address back", (x) => o(x.party_restore).party_live === true && o(x.party_restore).addr_live === true],
    ["a contact moves with its address", (x) => o(x.party_move).party_org === TARGET && o(x.party_move).addr_org === TARGET],
    ["a logo another brand uses survives the delete, named in the review", (x) => {
      const w = arr(x.shared_delete_preview).find((w) => w.kind === "kept_in_use");
      return !!w && w.count === 1 && o(x.shared_delete).file_live === true && o(o(x.shared_delete).commit).kept_in_use === 1;
    }],
    ["restore brings the brand and its asset back", (x) => o(x.shared_restore).brand_live === true && o(x.shared_restore).assets_live === 1],
  ],
};

async function main(): Promise<number> {
  const env = loadDbEnv();
  if ("missing" in env) {
    console.log(`[FAIL] UNMEASURED — missing ${env.missing.join(", ")} (looked in ${env.looked.join(", ")})`);
    return 1;
  }
  let failures = 0;
  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(resolve(DIR, file), "utf8");
    const client = await connectDirect(env, "check-change-engine-live");
    let obs: Obs = {};
    let error: string | null = null;
    try {
      await client.query("begin");
      const res = await client.query(sql);
      const last = Array.isArray(res) ? res[res.length - 1] : res;
      for (const row of (last?.rows ?? []) as Array<{ k: string; v: unknown }>) obs[row.k] = row.v;
    } catch (e) {
      const err = e as { code?: string; message?: string };
      error = `${err.code ?? ""} ${err.message ?? String(e)}`;
      obs = {};
    } finally {
      await client.query("rollback").catch(() => undefined);
      await client.end();
    }
    console.log(`\n${file}${error ? `  — ERROR ${error}` : ""}`);
    for (const [name, pred] of ASSERT[file] ?? [["has assertions", () => false]]) {
      let ok = false;
      try { ok = !error && pred(obs); } catch { ok = false; }
      if (!ok) failures += 1;
      console.log(`  ${ok ? "[ OK ]" : "[FAIL]"} ${name}`);
    }
  }
  console.log(failures === 0 ? "\n[ OK ] the change engine archives, restores and moves as the plan says." : `\n[FAIL] ${failures} assertion(s) failed.`);
  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => exitAfterDrain(code),
  (err) => {
    console.error("[FAIL] check-change-engine-live crashed:", err);
    exitAfterDrain(2);
  },
);
