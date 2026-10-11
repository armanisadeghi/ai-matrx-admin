import pg from "pg"; import fs from "fs";
const env=Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>/^CLONE_DATABASE_URL=/.test(l)).map(l=>[l.split("=")[0],l.slice(l.indexOf("=")+1).replace(/^["']|["']$/g,"")]));
const c=new pg.Client({connectionString:env.CLONE_DATABASE_URL.replace(/[?]sslmode=[a-z-]+/,""),ssl:{rejectUnauthorized:false}}); await c.connect();
for (const q of process.argv.slice(2)){ const r=await c.query(q); console.log(JSON.stringify(r.rows,null,1)); }
await c.end();
