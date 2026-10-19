import { readFileSync } from "node:fs";
import { buildCensus } from "./census";
const j=(p:string)=>JSON.parse(readFileSync(p,"utf8"));
const c=buildCensus({root:process.cwd(),entityTypes:j("lib/record-pages/entity-types.snapshot.json"),ledger:j("lib/record-pages/pending.json")});
const cls:Record<string,string[]>={};
for(const p of c.problems){const k=p.replace(/^[^:]*: /,"").replace(/"[^"]*"/g,'"X"').slice(0,60);(cls[k]??=[]).push(p)}
for(const [k,v] of Object.entries(cls))console.log(v.length,k);
console.log(c.counts);
require("node:fs").writeFileSync(process.argv[2],JSON.stringify(c.problems,null,1));
