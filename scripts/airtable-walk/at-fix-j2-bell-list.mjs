import { admin, say } from "./at-fix-j-lib.mjs";
const a = await admin();
const r = await a.sb.schema("communication").from("notification").select("*").gte("created_at", "2026-10-20T06:45:00Z").order("created_at", { ascending: false }).limit(40);
say(r.error?.message ?? "", [...new Set(r.data?.map((n) => String(n.title ?? n.subject ?? n.heading ?? "").slice(0, 70) + " @" + n.created_at.slice(11, 19)))].join(" || "));
