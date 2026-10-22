import { connectDirect, loadDbEnv } from "./lib/direct-db";
const env: any = loadDbEnv();
const client = await connectDirect(env, "ad-hoc read");
const r = await client.query(process.argv[2]);
console.log(JSON.stringify(r.rows, null, 1));
await client.end();
