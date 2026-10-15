// lane PERSON-UNDO: dump a live function body to a file (read-only).
import { writeFileSync } from "node:fs";
import { connectDirect, loadDbEnv } from "./lib/direct-db";
async function main() {
  const env = loadDbEnv();
  if ("missing" in env) throw new Error("no db env");
  const c = await connectDirect(env, "pu-dump");
  const r = await c.query(`select pg_get_functiondef('${process.argv[3]}'::regprocedure) d`);
  writeFileSync(process.argv[2]!, r.rows[0].d);
  await c.end();
}
void main();
