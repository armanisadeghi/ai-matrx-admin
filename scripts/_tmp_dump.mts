import { connectDirect, loadDbEnv } from "./lib/direct-db";
const c: any = await connectDirect(loadDbEnv() as any, "dump");
for (const n of process.argv.slice(2)) {
  const r = await c.query(`select p.oid::regprocedure::text sig, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname||'.'||p.proname = $1`, [n]);
  for (const row of r.rows) console.log("--  "+row.sig+"\n"+row.def);
}
await c.end();
