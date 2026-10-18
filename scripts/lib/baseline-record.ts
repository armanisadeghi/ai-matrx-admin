/**
 * Find a TEST BASELINE record by its stable key, never by uuid.
 *
 * The baseline (admin@admin.com + test@test.com, demo organizations) is seeded and rebuilt by
 * aidream `uv run python scripts/seed_test_baseline.py --all --apply`; manifests live in
 * aidream/aidream/testing/baseline/manifests/<module>.json. Every baseline row carries
 * `metadata.baseline_key = "<module>:<account>:<key>"` (education: `education:<key>`).
 *
 *   import { baselineRecord } from "./lib/baseline-record";
 *   const dealId = await baselineRecord("crm", "test:deal-alder-creek-dental-plan");
 *
 * Python twin: `aidream.testing.baseline.baseline_record(module, key)`.
 */
import type pg from "pg";

import { connectDirect, loadDbEnv } from "./direct-db";

export type BaselineModule = "crm" | "hr" | "meetings" | "notes" | "workbooks" | "projects" | "education";

/** module -> key-prefix -> table. Longest prefix wins; "" is the module's default table. */
const TABLES: Record<BaselineModule, Record<string, string>> = {
  crm: { "party-": "crm.party", "deal-": "crm.deal" },
  hr: { "employee-": "hr.employee", "pay-group-": "hr.pay_group", "leave-policy-": "hr.leave_policy", "job-title-": "hr.job_title" },
  meetings: { "": "communication.meet_meetings" },
  notes: { "": "workbench.notes" },
  workbooks: { "": "workbench.udt_workbooks" },
  projects: { "": "projects.projects" },
  education: { "": "education.math_course_structure" },
};

export function baselineTable(module: BaselineModule, key: string): string {
  const tail = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
  const entries = Object.entries(TABLES[module]).sort((a, b) => b[0].length - a[0].length);
  const hit = entries.find(([prefix]) => tail.startsWith(prefix));
  if (!hit) throw new Error(`no baseline table for ${module}:${key}`);
  return hit[1];
}

/**
 * The id of the live baseline record `<module>:<key>` (key = `<account>:<slug>`, or the bare slug
 * for education). Throws when it is missing — re-run the seeder, never fall back to a uuid.
 */
export async function baselineRecord(module: BaselineModule, key: string, client?: pg.Client): Promise<string> {
  const table = baselineTable(module, key);
  const full = `${module}:${key}`;
  let own: pg.Client | undefined;
  let db = client;
  if (!db) {
    const env = loadDbEnv();
    if ("missing" in env) throw new Error(`baselineRecord: database env missing ${env.missing.join(", ")}`);
    own = await connectDirect(env, "baseline-record");
    db = own;
  }
  try {
    const { rows } = await db.query<{ id: string }>(
      `select id::text from ${table} where metadata->>'baseline_key' = $1 and deleted_at is null limit 1`,
      [full],
    );
    if (!rows[0]) {
      throw new Error(
        `baseline record ${full} is missing; run (aidream) uv run python scripts/seed_test_baseline.py --module ${module} --apply`,
      );
    }
    return rows[0].id;
  } finally {
    await own?.end();
  }
}
