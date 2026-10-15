// lane PERSON-UNDO: rolled-back proof. Applies a migration file inside a transaction, runs the Email change + its undo
// as the admin, prints the column's shape at each step, then ROLLS BACK (nothing persists). Args: file org field user
import { readFileSync } from "node:fs";
import { connectDirect, loadDbEnv } from "./lib/direct-db";
async function main() {
  const [file, org, field, user, apply] = process.argv.slice(2) as [string, string, string, string, string];
  const env = loadDbEnv();
  if ("missing" in env) throw new Error("no db env");
  const c = await connectDirect(env, "pu-proof");
  const shape = async (tag: string) => {
    const r = await c.query("select data from custom.record where id=$1", [field]);
    const d = r.rows[0].data;
    console.log(tag, JSON.stringify({ type: d.type, format: d.format, parity: d.parity_type, rules: d.rules, rt: d.relation_target, max: d.relation_max, otd: d.on_target_delete }));
  };
  const t0 = Date.now();
  await c.query("begin");
  try {
    if (apply === "apply") await c.query(readFileSync(file, "utf8"));
    await c.query("select set_config('app.user_id', $1, true), set_config('request.jwt.claims', $2, true)", [user, JSON.stringify({ sub: user, role: "authenticated" })]);
    await shape("before ");
    await c.query("select custom.field_update($1::uuid, $2::uuid, $3::jsonb)", [org, field, JSON.stringify({ parity_type: "email" })]);
    await shape("email  ");
    const m = await c.query("select id, inverse from history.migration_log where target_id=$1 order by applied_at desc, id limit 1", [field]);
    console.log("inverse", JSON.stringify(m.rows[0].inverse));
    await c.query("select custom.migrate_undo($1::uuid, $2::uuid)", [org, m.rows[0].id]);
    await shape("undone ");
  } catch (e) {
    console.log("ERROR", (e as Error).message);
  }
  await c.query("rollback");
  console.log("rolled back in", Date.now() - t0, "ms");
  await c.end();
}
void main();
