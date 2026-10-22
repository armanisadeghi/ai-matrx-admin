// BA- clean-up: archive every BA- table this lane made (archive, never destroy).
import { admin, say } from "./ba-lib.mjs";
const A = await admin();
const token = (await A.sb.auth.getSession()).data.session.access_token;
const API = "https://server.app.matrxserver.com/api/v1/tables";
const list = await (await fetch(API + "?search=BA-", { headers: { Authorization: `Bearer ${token}` } })).json();
for (const t of (list.tables ?? []).filter((t) => /^BA- /.test(t.name))) {
  const r = await fetch(`${API}/${t.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, ...(t.organization_id ? { "X-Organization-Id": t.organization_id } : {}) } });
  say("archive", t.name, t.id, r.status, (await r.text()).slice(0, 120));
}
