// AT-FIX-J2: the same REST filter on the restricted Qty column as admin and as the member (is the member's empty answer a silent refusal?).
import { admin, member, say } from "./at-fix-j-lib.mjs";
const SERVER = "https://server.app.matrxserver.com";
for (const [who, make] of [["admin", admin], ["member", member]]) {
  const p = await make(); const token = (await p.sb.auth.getSession()).data.session.access_token;
  const r = await fetch(`${SERVER}/v1/tables/${process.env.TABLE}/rows?where=${encodeURIComponent(JSON.stringify({ Qty: { gte: 9 } }))}`, { headers: { authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => null);
  say(who, r.status, JSON.stringify(j?.rows?.map((x) => x.values?.Name) ?? j).slice(0, 300), "total", j?.total, JSON.stringify(j?.notes ?? j?.hint ?? "").slice(0, 200));
}
