/**
 * plan.restore_brief_run is the live function body of the NEWEST migration that defines it.
 * It runs under RLS (security invoker): a caller without edit rights updates 0 rows, and that
 * must be an error the UI shows, never a success. Proven live too (rolled-back transaction as a
 * viewer: 42501 with this message).
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), "migrations");
const latest = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({ f, sql: readFileSync(join(dir, f), "utf8") }))
  .filter(({ sql }) => /create or replace function plan\.restore_brief_run/i.test(sql))
  .pop();

const BRIEF_DRAFT_FIELDS = [
  "brief", "angle", "must_not_cover", "concerns", "suggested_word_count", "mandate_key",
  "agent_id", "model_id", "generated_at", "run_id", "accepted_at", "writing_check",
];

describe("plan.restore_brief_run (live definition)", () => {
  it("raises when the node update changed nothing", () => {
    const sql = latest!.sql;
    const afterUpdate = sql.slice(sql.search(/update plan\.node/i));
    expect(afterUpdate).toMatch(/if not found then\s+raise exception '[^']*permission[^']*'/i);
    expect(afterUpdate.search(/if not found/i)).toBeLessThan(afterUpdate.search(/return jsonb_build_object/i));
  });

  it("copies only BriefDraft's fields from the run result and keeps the mandate_key default", () => {
    const sql = latest!.sql;
    for (const field of BRIEF_DRAFT_FIELDS) expect(sql).toContain(`'${field}'`);
    expect(sql).toMatch(/'mandate_key', 'content_plan\.brief_writer'/);
    expect(sql).toMatch(/jsonb_each\(v_run\.result\)/); // filtered copy, not `|| v_run.result`
    expect(sql).not.toMatch(/\|\|\s*v_run\.result\s*\|\|/);
  });
});
