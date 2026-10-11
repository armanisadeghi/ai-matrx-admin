import { connectDirect, loadDbEnv } from "./lib/direct-db";
const sql = process.argv[2];
const env = loadDbEnv();
const c: any = await connectDirect(env as any, "share-dialog-2");
const r = await c.query(sql);
console.log(JSON.stringify(r.rows ?? r, null, 1));
await c.end?.();
