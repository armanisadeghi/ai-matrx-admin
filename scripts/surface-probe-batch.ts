#!/usr/bin/env npx tsx
/**
 * surface-probe-batch — probe many surfaces on the live site and RECORD each
 * result onto `ui.ui_surface.last_check` (surface declarations W0-D).
 *
 * Each surface runs `scripts/surface-probe.mjs --record` (one headless browser
 * per probe, signed in as the admin test account; the probe refuses to record
 * as anyone else). At most TWO browsers at once (machine memory rule), with a
 * pause between launches, so neither this Mac nor the site is hammered.
 *
 * Default list: every active code-declared surface with a route — routes with
 * no record segment as they are, dynamic routes filled from the FIXTURE MAP
 * below with a record the admin test account (admin@admin.com) owns. The
 * lookup is read-only; a dynamic route with no fixture, or no admin record, is
 * skipped and listed with its reason. Never a person's record.
 *
 * Usage:
 *   pnpm surface:probe:batch [--surface a,b] [--match REGEX] [--limit N]
 *     [--concurrency 1|2] [--pause MS] [--base https://www.aimatrx.com]
 *     [--out DIR] [--dry-run]
 *
 * Exit 0 when every probe ran and recorded (pass or fail is data, not an
 * error); 1 when a probe could not record; 2 on a setup error.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { connectDirect, loadDbEnv } from "./lib/direct-db";
import { PROBE_IDENTITY } from "./surface-probe-record";

const ROOT = path.resolve(__dirname, "..");
const MAX_BROWSERS = 2;

interface Opts {
  surfaces: string[];
  match: RegExp | null;
  limit: number;
  concurrency: number;
  pause: number;
  base: string;
  out: string;
  dryRun: boolean;
}

function parseArgs(): Opts {
  const o: Opts = {
    surfaces: [],
    match: null,
    limit: Infinity,
    concurrency: MAX_BROWSERS,
    pause: 3000,
    base: "https://www.aimatrx.com",
    out: path.join(os.tmpdir(), "surface-probe-batch", new Date().toISOString().replace(/[:.]/g, "-")),
    dryRun: false,
  };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i += 1) {
    const v = a[i + 1];
    if (a[i] === "--surface") (o.surfaces.push(...(v ?? "").split(",").filter(Boolean)), (i += 1));
    else if (a[i] === "--match") ((o.match = new RegExp(v ?? "")), (i += 1));
    else if (a[i] === "--limit") ((o.limit = Number(v)), (i += 1));
    else if (a[i] === "--concurrency") ((o.concurrency = Math.min(MAX_BROWSERS, Math.max(1, Number(v)))), (i += 1));
    else if (a[i] === "--pause") ((o.pause = Number(v)), (i += 1));
    else if (a[i] === "--base") ((o.base = (v ?? "").replace(/\/$/, "")), (i += 1));
    else if (a[i] === "--out") ((o.out = v ?? o.out), (i += 1));
    else if (a[i] === "--dry-run") o.dryRun = true;
    else {
      console.error(`[surface-probe-batch] unknown argument ${a[i]} — see the header of scripts/surface-probe-batch.ts`);
      process.exit(2);
    }
  }
  return o;
}

/**
 * FIXTURE MAP — route segment → the admin test account's record that fills it.
 * Each query takes $1 = the admin's user id and returns the newest live row it
 * created. `[siteId]` under `/marketing/brands/[brandId]` takes $2 = the brand found.
 * A dynamic route whose every segment is not covered here is skipped.
 */
const FIXTURES: { route: RegExp; segment: string; sql: string }[] = [
  { route: /^\/notes\/\[id\]/, segment: "[id]", sql: "select id from workbench.notes where created_by = $1 and deleted_at is null order by created_at desc limit 1" },
  { route: /^\/education\/flashcards\/\[setId\]/, segment: "[setId]", sql: "select id from education.fc_set where created_by = $1 and deleted_at is null order by created_at desc limit 1" },
  { route: /^\/crm\/\[partyId\]/, segment: "[partyId]", sql: "select id from crm.party where created_by = $1 and deleted_at is null order by created_at desc limit 1" },
  { route: /^\/agents\/\[id\]/, segment: "[id]", sql: "select id from agent.definition where created_by = $1 and deleted_at is null and not coalesce(is_archived, false) order by created_at desc limit 1" },
  { route: /^\/documents\/\[id\]/, segment: "[id]", sql: "select id from content.document where created_by = $1 and deleted_at is null order by created_at desc limit 1" },
  { route: /^\/presentations\/\[id\]/, segment: "[id]", sql: "select id from workbench.presentation where created_by = $1 and deleted_at is null order by created_at desc limit 1" },
  { route: /^\/research\/topics\/\[topicId\]/, segment: "[topicId]", sql: "select id from research.rs_topic where created_by = $1 and deleted_at is null order by created_at desc limit 1" },
  { route: /^\/chat\/message-templates\/\[id\]/, segment: "[id]", sql: "select id from agent.message_template where created_by = $1 and deleted_at is null order by created_at desc limit 1" },
  { route: /^\/marketing\/\[brandId\]/, segment: "[brandId]", sql: "select id from web.brand where created_by = $1 and deleted_at is null order by created_at desc limit 1" },
  { route: /^\/marketing\/\[brandId\]\/.*\[siteId\]/, segment: "[siteId]", sql: "select id from web.site where created_by = $1 and brand_id = $2 and deleted_at is null order by created_at desc limit 1" },
];

interface Planned {
  surface: string;
  pattern: string;
  route: string | null;
  recordId: string | null;
  skip?: string;
}

const isDynamic = (p: string) => /\[|:/.test(p);

async function plan(opts: Opts): Promise<Planned[]> {
  const env = loadDbEnv();
  if ("missing" in env) {
    console.error(`[surface-probe-batch] database variables missing: ${env.missing.join(", ")}`);
    process.exit(2);
  }
  const db = await connectDirect(env, "surface-probe-batch");
  try {
    const admin = await db.query<{ id: string }>("select id from auth.users where email = $1", [PROBE_IDENTITY]);
    const adminId = admin.rows[0]?.id;
    if (!adminId) throw new Error(`no auth user ${PROBE_IDENTITY}`);
    const rows = await db.query<{ name: string; url_pattern: string }>(
      `select name, url_pattern from ui.ui_surface
        where deleted_at is null and is_active and declared_by = 'code' and url_pattern is not null
        order by name`,
    );
    const cache = new Map<string, string | null>();
    const lookup = async (sql: string, params: string[]) => {
      const key = `${sql}|${params.join(",")}`;
      if (!cache.has(key)) cache.set(key, (await db.query<{ id: string }>(sql, params)).rows[0]?.id ?? null);
      return cache.get(key) ?? null;
    };
    const out: Planned[] = [];
    for (const { name, url_pattern } of rows.rows) {
      if (opts.surfaces.length && !opts.surfaces.includes(name)) continue;
      if (opts.match && !opts.match.test(name)) continue;
      // A trailing `*` marks a prefix match ("/marketing/initiatives*"); the probe opens the prefix.
      const pattern = url_pattern.trim().replace(/\*$/, "");
      if (!isDynamic(pattern)) {
        out.push({ surface: name, pattern, route: pattern, recordId: null });
        continue;
      }
      let route = pattern;
      let recordId: string | null = null;
      let brand: string | null = null;
      let skip: string | undefined;
      for (const fx of FIXTURES) {
        if (!fx.route.test(pattern) || !route.includes(fx.segment)) continue;
        const id = await lookup(fx.sql, fx.segment === "[siteId]" && brand ? [adminId, brand] : [adminId]);
        if (!id) {
          skip = `admin test account owns no record for ${fx.segment}`;
          break;
        }
        if (fx.segment === "[brandId]") brand = id;
        route = route.replace(fx.segment, id);
        recordId = id; // the innermost record the page shows
      }
      if (!skip && isDynamic(route)) skip = `no fixture for ${route.match(/\[[^\]]+\]|:\w+/)?.[0]}`;
      out.push({ surface: name, pattern, route: skip ? null : route, recordId, skip });
    }
    return out;
  } finally {
    await db.end();
  }
}

interface Outcome {
  surface: string;
  route: string;
  status: string;
  supplied: number;
  declaredOn: number;
  missing: string[];
  error?: string;
}

/** Admin pages are served by the admin site (manage.aimatrx.com), not www. */
function baseFor(route: string, base: string): string {
  return route.startsWith("/administration") && /\/\/(www\.)?aimatrx\.com$/.test(base) ? "https://manage.aimatrx.com" : base;
}

function runProbe(p: Planned, slot: number, opts: Opts): Promise<Outcome> {
  const file = path.join(opts.out, `${p.surface.replace(/\//g, "__")}.json`);
  const args = [
    path.join(ROOT, "scripts/surface-probe.mjs"),
    "--surface", p.surface,
    "--route", p.route!,
    "--base", baseFor(p.route!, opts.base),
    "--record", ...(p.recordId ? [p.recordId] : []),
    "--out", file,
  ];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, SURFACE_PROBE_PROFILE_SLOT: String(slot) },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("close", () => {
      const base: Outcome = { surface: p.surface, route: p.route!, status: "error", supplied: 0, declaredOn: 0, missing: [] };
      if (!existsSync(file)) return resolve({ ...base, error: stderr.trim().slice(-300) || "no report written" });
      try {
        const report = JSON.parse(readFileSync(file, "utf8"));
        const rec = report.recorded;
        if (!rec || rec.error) return resolve({ ...base, error: rec?.error ?? "not recorded" });
        resolve({
          ...base,
          status: rec.status,
          supplied: rec.suppliedValues.filter((k: string) => rec.declaredOn.includes(k)).length,
          declaredOn: rec.declaredOn.length,
          missing: rec.missing,
        });
      } catch (e) {
        resolve({ ...base, error: `unreadable report: ${(e as Error).message}` });
      }
    });
  });
}

async function main() {
  const opts = parseArgs();
  const planned = await plan(opts);
  const runnable = planned.filter((p) => p.route).slice(0, opts.limit);
  const skipped = planned.filter((p) => !p.route);
  console.log(`[surface-probe-batch] ${runnable.length} to probe on ${opts.base}, ${skipped.length} skipped; reports → ${opts.out}`);
  for (const s of skipped) console.log(`  skip ${s.surface} (${s.pattern}): ${s.skip}`);
  if (opts.dryRun) {
    for (const p of runnable) console.log(`  plan ${p.surface} → ${p.route}${p.recordId ? ` (record ${p.recordId})` : ""}`);
    return 0;
  }
  mkdirSync(opts.out, { recursive: true });
  const queue = [...runnable];
  const outcomes: Outcome[] = [];
  const worker = async (slot: number) => {
    // Stagger the two slots so their sign-ins and first loads do not collide.
    await new Promise((r) => setTimeout(r, slot * opts.pause));
    for (let p = queue.shift(); p; p = queue.shift()) {
      const o = await runProbe(p, slot, opts);
      outcomes.push(o);
      console.log(
        `  ${o.status.padEnd(5)} ${o.surface} ${o.route} ${o.supplied}/${o.declaredOn}` +
          (o.missing.length ? ` missing: ${o.missing.join(", ")}` : "") +
          (o.error ? ` ERROR: ${o.error}` : ""),
      );
      await new Promise((r) => setTimeout(r, opts.pause));
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency }, (_, i) => worker(i)));
  const errors = outcomes.filter((o) => o.status === "error");
  const pass = outcomes.filter((o) => o.status === "pass").length;
  console.log(`[surface-probe-batch] recorded ${outcomes.length - errors.length}/${outcomes.length} (pass ${pass}), errors ${errors.length}`);
  return errors.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`[surface-probe-batch] ${(e as Error)?.message ?? e}`);
    process.exit(2);
  },
);
