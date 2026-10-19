// AT-FIX-E3 cleanup: archive records (recordDelete = archive) and base name rows by id, as admin, in WALK_ORG_ID.
// usage: WALK_ORG_ID=<org> node at-fix-e3-clean.mjs record:<id> base:<id> ...
import { store } from "./store.mjs";
const { client, sb } = await store();
for (const arg of process.argv.slice(2)) {
  const [kind, id] = arg.split(":");
  if (kind === "record") {
    const r = await client.recordDelete({ record_id: id });
    console.log(arg, r.ok ? "archived" : `ERR ${JSON.stringify(r.error).slice(0, 160)}`);
  } else if (kind === "base") {
    const { error } = await sb.schema("custom").from("base").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    console.log(arg, error ? `ERR ${error.message}` : "archived");
  }
}
