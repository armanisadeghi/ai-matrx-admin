import { connectDirect, loadDbEnv } from "./lib/direct-db";
(async () => {
  const env = loadDbEnv() as any; if (!env.host) throw new Error("no env");
  const c = await connectDirect(env, "snap3-read");
  const sql = process.argv[2];
  const r = await c.query(sql);
  console.log(JSON.stringify(r.rows, null, 1));
  await c.end();
})().catch((e) => { console.error(String(e)); process.exit(1); });
