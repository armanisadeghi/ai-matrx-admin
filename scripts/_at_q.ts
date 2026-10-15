import { connectDirect, loadDbEnv } from "./lib/direct-db";
const sql = process.argv[2];
(async()=>{const env=loadDbEnv(); const c:any=await connectDirect(env as any,"at-share-q"); const r=await c.query(sql); console.log(r.rows.map((x:any)=>Object.values(x).join(" | ")).join("\n")); await c.end(); process.exit(0);})();
