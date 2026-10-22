// scripts/forms/portal-access-proof.mjs — CD-PAGE-12's store half, proven on the one database, ROLLED BACK.
//
//   node scripts/forms/portal-access-proof.mjs              against live, in one transaction that is rolled back
//   node scripts/forms/portal-access-proof.mjs --rehearse   applies portalx_a_… inside that transaction first
//
// Rincon's "Your service calls" portal (admin@admin.com's organization; its client table is buildings, its principal is
// test@test.com). Inside ONE transaction that is rolled back: the owner turns sign-up and comment notices on, a new
// building manager signs herself up, and the office comments on one of test@test.com's service calls. Nothing outlives
// the run. Before the migration the doors and the access settings do not exist and every proof is RED.
import pg from "pg";
import fs from "node:fs";
import { dsnFor, pgClient } from "../lib/pooled-db.mjs";

const rehearse = process.argv.includes("--rehearse");
const MIGRATION = new URL("../../migrations/campaign/portalx_a_a_portal_lets_clients_sign_up_sign_in_their_way_and_hear_of_comments.sql", import.meta.url);
const SLUG = "rincon-service-calls-live-09250525";
const RECORD = "6b1f598d-74af-438d-a6ea-fa4114b49381"; // one of test@test.com's service calls (names her building)
const db = pgClient(pg, dsnFor("production", { app: "portal-access-proof" }));
await db.connect();
const results = [];
let failures = 0;
const one = async (sql, args) => (await db.query(sql, args)).rows[0];
const proof = async (name, fn) => {
  await db.query("savepoint p");
  try { await fn(); results.push(`GREEN ${name}`); await db.query("release savepoint p"); }
  catch (e) { failures++; results.push(`RED   ${name} — ${String(e.message).split("\n")[0].slice(0, 220)}`); await db.query("rollback to savepoint p"); }
};
const asUser = (id) => db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id, role: "authenticated" })]);
const asServer = () => db.query("select set_config('request.jwt.claims', '', true)");

try {
  await db.query("begin read write");
  await db.query("set local statement_timeout = '60s'");
  if (rehearse) await db.query(fs.readFileSync(MIGRATION, "utf8"));
  const portal = await one("select * from custom.portal where slug = $1", [SLUG]);
  const admin = (await one("select id from auth.users where email = 'admin@admin.com'")).id;
  const member = (await one("select id from auth.users where email = 'test@test.com'")).id;

  await proof("the sign-in page says which ways in it offers, all off but the email link", async () => {
    const pub = (await one("select custom.portal_public($1) as r", [SLUG])).r;
    if (JSON.stringify(pub.access) !== JSON.stringify({ google: false, password: false, magic_link: true, self_signup: false })) throw new Error(JSON.stringify(pub.access));
  });
  await proof("sign-up is refused in words while the owner has not turned it on", async () => {
    const r = (await one("select custom.portal_self_signup($1, 'maya.okafor@harborview-properties.com', 'Harborview Tower') as r", [SLUG])).r;
    if (r.state !== "off") throw new Error(JSON.stringify(r));
  });
  await proof("the owner's sign-in settings pass the portal's judge, and a made-up one is refused by name", async () => {
    const exposed = (await one("select array_agg(table_id) as t from custom.portal_table where portal_id = $1", [portal.id])).t;
    const judged = (await one("select custom._portal_config_judge($1, $2::uuid[], $3::jsonb, $4::jsonb) as r", [portal.organization_id, exposed, JSON.stringify(portal.config ?? {}),
      JSON.stringify({ access: { self_signup: true, password: true, google: true, notify_comments: true, name_field: "building", email_field: "manager_email" } })])).r;
    if (judged.access?.self_signup !== true || judged.access?.name_field !== "building") throw new Error(JSON.stringify(judged.access));
    await db.query("savepoint j");
    try {
      await db.query("select custom._portal_config_judge($1, $2::uuid[], '{}'::jsonb, '{\"access\":{\"sms\":true}}'::jsonb)", [portal.organization_id, exposed]);
      throw new Error("a made-up setting was accepted");
    } catch (e) {
      await db.query("rollback to savepoint j");
      if (!String(e.message).includes('"sms" is none of them')) throw e;
    }
    await db.query("update custom.portal set config = $2::jsonb where id = $1", [portal.id, JSON.stringify(judged)]);
  });
  await proof("a visitor signs herself up: a client row with her name and address, and a principal for her", async () => {
    await asServer();
    const r = (await one("select custom.portal_self_signup($1, 'Maya.Okafor@harborview-properties.com', 'Harborview Tower') as r", [SLUG])).r;
    if (r.state !== "signed_up") throw new Error(JSON.stringify(r));
    const rec = await one("select data from custom.record where id = $1", [r.client_record_id]);
    if (rec.data.building !== "Harborview Tower" || rec.data.manager_email !== "maya.okafor@harborview-properties.com") throw new Error(JSON.stringify(rec.data));
    const inv = (await one("select custom.portal_invitation($1, 'maya.okafor@harborview-properties.com') as r", [SLUG])).r;
    if (!inv || inv.bound !== false) throw new Error(`invitation ${JSON.stringify(inv)}`);
    const again = (await one("select custom.portal_self_signup($1, 'maya.okafor@harborview-properties.com', 'Harborview Tower') as r", [SLUG])).r;
    if (again.state !== "exists") throw new Error(`second sign-up ${JSON.stringify(again)}`);
  });
  await proof("a signed-in person (and a stranger) cannot reach the sign-up door: only the server lane holds it", async () => {
    for (const role of ["authenticated", "anon"]) {
      await db.query("savepoint s");
      try {
        await db.query(`set local role ${role}`);
        await db.query("select custom.portal_self_signup($1, 'x.y@harborview-properties.com', 'X')", [SLUG]);
        throw new Error(`${role} was let in`);
      } catch (e) {
        await db.query("rollback to savepoint s");
        if (!/permission denied/.test(String(e.message))) throw e;
      }
    }
  });
  await proof("the sign-in page now offers sign-up, a password and Google", async () => {
    const pub = (await one("select custom.portal_public($1) as r", [SLUG])).r;
    if (!pub.access.self_signup || !pub.access.password || !pub.access.google) throw new Error(JSON.stringify(pub.access));
  });
  await proof("the office comments on her service call and she is emailed; her own comment emails nobody", async () => {
    const comment = (author, body) => one(
      "insert into platform.comments (organization_id, entity_type, entity_id, body, metadata, created_by, updated_by) values ($1, 'record', $2, $3, jsonb_build_object('table_id', $4::uuid), $5, $5) returning id",
      [portal.organization_id, RECORD, body, "a4f4b7ab-10af-41b9-b1b8-784d6f2ee5b7", author]);
    await asUser(admin);
    const c = (await comment(admin, "The technician is on the way, about 20 minutes out.")).id;
    const n = await db.query("select channel, to_address, subject, deep_link from communication.notification where event_key = 'custom.portal.client_notice' and dedupe_key like $1", [`portal-comment:${c}:%`]);
    if (n.rows.length !== 1 || n.rows[0].to_address !== "test@test.com" || n.rows[0].channel !== "email") throw new Error(JSON.stringify(n.rows));
    if (!String(n.rows[0].deep_link).includes(`/portal/c/${SLUG}/r/${RECORD}`)) throw new Error(`link ${n.rows[0].deep_link}`);
    await asUser(member);
    const mine = (await comment(member, "Thanks, I will meet them at the gate.")).id;
    const none = await db.query("select 1 from communication.notification where event_key = 'custom.portal.client_notice' and dedupe_key like $1", [`portal-comment:${mine}:%`]);
    if (none.rows.length !== 0) throw new Error("she was emailed about her own comment");
  });
} catch (e) {
  failures++;
  results.push(`RED   setup — ${String(e.message).split("\n")[0]}`);
} finally {
  await db.query("rollback").catch(() => undefined);
  await db.end();
}
for (const line of results) console.log(line);
console.log(failures === 0 ? `ALL GREEN (${rehearse ? "rehearsed, rolled back" : "live, rolled back"})` : `${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
