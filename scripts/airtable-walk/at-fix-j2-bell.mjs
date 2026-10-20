// AT-FIX-J2 item 4c: did the hourly summary arrive? Read admin's notification rows through the signed-in client (own rows only).
import { admin, say } from "./at-fix-j-lib.mjs";
const a = await admin();
for (const [schema, table] of [["communication", "notification"], ["communication", "notifications"]]) {
  const r = await a.sb.schema(schema).from(table).select("*").order("created_at", { ascending: false }).limit(5);
  say(schema + "." + table, r.error ? r.error.message : JSON.stringify(r.data.map((n) => ({ at: n.created_at, title: n.title ?? n.subject, body: String(n.body ?? n.message ?? "").slice(0, 120) }))));
}
