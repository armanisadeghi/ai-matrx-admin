// where are the given table ids? usage: node at-walk-e4-where.mjs <orgId,orgId> <name-substr>
import { store } from "./store.mjs";
for (const org of process.argv[2].split(",")) {
  process.env.WALK_ORG_ID = org;
  const { client } = await store();
  const r = await client.tableList();
  console.log(org, r.ok ? JSON.stringify(r.data.filter((x) => x.name.includes(process.argv[3])).map((x) => [x.id, x.name])) : JSON.stringify(r.error));
}
