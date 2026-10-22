import { admin, say } from "./ba-lib.mjs";
const A = await admin(); const rid="80ad2c51-b27a-4632-a462-282fc0db18fc";
for (const [w,r] of [["2025-03-01","2026-10-22T17:00:00Z"],["2025-03-01","2026-10-22T17:30:00Z"],["2024-03-01","2026-10-22T17:30:00Z"]]) {
 const x = await A.client.recordAsOf({ record_id: rid, world_on: w, recorded_at: r }); say("world",w,"said",r,"->",x.data?.address);
}
process.exit(0);
