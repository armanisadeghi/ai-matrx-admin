import { admin, say } from "./at-fix-j-lib.mjs";
const a = await admin();
const until = Date.now() + 14 * 60_000;
while (Date.now() < until) {
  const r = await a.sb.schema("communication").from("notification").select("created_at,title,body").or("subject.ilike.%ATFJ2%,title.ilike.%ATFJ2%").order("created_at", { ascending: false }).limit(3);
  if (r.data?.length) { say("ARRIVED", JSON.stringify(r.data)); process.exit(0); }
  await new Promise((z) => setTimeout(z, 20000));
}
say("NOT ARRIVED by", new Date().toISOString());
