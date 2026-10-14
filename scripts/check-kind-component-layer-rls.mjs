// scripts/check-kind-component-layer-rls.mjs — live safety test for content_ir.kind_component_layer
// (shape layers slice 1, common-docs/systems/architecture/content-ir/projects/shape-layers/PLAN.md).
//
//   node --env-file=.env.local scripts/check-kind-component-layer-rls.mjs
//
// Real people on the LIVE database, over the real REST door, made by the persona factory (tagged,
// expiring, made and torn down in parallel):
//   A  = owner of organization X        C = admin of X (A's coworker)
//   M  = plain member of X              B = a person in another organization
// Invariants (owner ruling 2026-10-14: the table is Organization class, so a coworker MAY read a
// user row at the database; what matters is the scoped layer read and who may write):
//   0. The write barrier exists: zzz_layer_audience_gate is attached, enabled, BEFORE INSERT/UPDATE/
//      DELETE (std_update/std_delete admit org admins and members; only the trigger refuses them).
//   1. A user-layer row is never returned by the scoped layer read for anyone but its audience user,
//      and never writable by anyone but its author — not by update, delete, upsert, or the generic
//      RPC doors (entity_soft_delete, entity_undelete, version_restore). B (other org) and anon read nothing.
//   2. Nobody writes a user row for someone else, or an org row for an org they do not administer.
//      Audience columns never change.
//   3. Org members read an org row; a non-member does not.
//   4. created_by is the author, whatever the payload says.
//   5. A shape view is never shared: no grant and no share link can name it, not even from the server.
// Exit 1 on any failed assertion, or if a probe row is left behind.
//
// Client-side plants (prove an assertion can fail without touching the database):
//   PLANT=unscoped_read     the coworker's layer read drops its audience predicate
//   PLANT=wrong_author      assertion 4 expects the coworker as author
//   PLANT=anon_key          the anonymous reader holds a key that can read (the DB refuses a real anon grant)
// Several at once: PLANT=unscoped_read,wrong_author,anon_key
// Database-side plants are applied by hand around a run (see the slice-1 note in PLAN.md).
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { formatDurationMs } from "@ai-matrx/kit/format";
import {
  testTarget,
  createOrgAdminFixture,
  createFixtureUser,
  deleteFixtureUsers,
  fixtureSessionCookies,
} from "./lib/persona.mjs";

const SUITE = "content-ir/shape-layers";
const TABLE = "kind_component_layer";
const TOKEN = "content_ir_kind_component_layer";
const PLANTS = new Set((process.env.PLANT ?? "").split(",").filter(Boolean));
const PLANT = [...PLANTS].join(",");
const target = testTarget();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!publishableKey) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set.");

const service = createClient(target.url, target.secretKey, { auth: { persistSession: false } });
// The database refuses an anon key on an Organization-class table (anon_key_needs_a_class_lane), so the
// anon plant is client-side: the "anonymous" reader is handed a key that can read.
const anon = createClient(target.url, PLANTS.has("anon_key") ? target.secretKey : publishableKey, { auth: { persistSession: false } });

/** A signed-in client for a fixture persona (the factory mints the session and refuses untagged accounts). */
async function signedIn(user) {
  const cookies = await fixtureSessionCookies(target, user, { host: "localhost" });
  const raw = cookies.map((c) => c.value).join("").replace(/^base64-/, "");
  const session = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  return createClient(target.url, publishableKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const layer = (client) => client.schema("content_ir").from(TABLE);
const madeIds = new Set();
const madeGrantIds = new Set();
const madeLinkIds = new Set();
const KIND = `zz_layer_probe_${Date.now().toString(36)}`;

function row(extra) {
  return { kind: KIND, platform: "web", role: "output", component_key: "probe_view", source: "db", component_source: "export default function V(){return null}", ...extra };
}

async function insert(client, values) {
  const { data, error } = await layer(client).insert(values).select("id, created_by, audience_user_id, audience_organization_id").maybeSingle();
  if (data?.id) madeIds.add(data.id);
  return { data, error };
}

async function readById(client, id) {
  const { data, error } = await layer(client).select("id").eq("id", id);
  return { rows: data ?? [], error };
}

/** The row as the database holds it (service read), for "nothing changed" assertions. */
async function truth(id) {
  const { data, error } = await layer(service).select("id, notes, deleted_at, version, audience_user_id, created_by").eq("id", id).maybeSingle();
  if (error) throw new Error(`service read failed: ${error.message}`);
  return data;
}

/** The scoped layer read every renderer must use (PLAN v2 "Reads declare their own scope"). */
async function scopedRead(client, uid, orgIds) {
  let q = layer(client).select("id").like("kind", `${KIND}%`).is("deleted_at", null);
  if (!PLANTS.has("unscoped_read")) {
    const orgs = orgIds.length ? `,audience_organization_id.in.(${orgIds.join(",")})` : "";
    q = q.or(`audience_user_id.eq.${uid}${orgs}`);
  }
  const { data, error } = await q;
  if (error) throw new Error(`scoped read failed: ${error.message}`);
  return (data ?? []).map((r) => r.id);
}

async function myOrgIds(client) {
  const { data, error } = await client.schema("iam").from("organization_member").select("organization_id");
  if (error) throw new Error(`could not list my organizations: ${error.message}`);
  return [...new Set((data ?? []).map((r) => r.organization_id))];
}

/** An outsider's attempt on A's user row must leave it exactly as it was. */
async function unchanged(label, before, attempt) {
  const { error } = await attempt;
  const after = await truth(before.id);
  const same = !!after && after.notes === before.notes && after.deleted_at === before.deleted_at && after.version === before.version;
  check(label, same, error ? `refused: ${error.code ?? error.message}` : same ? "no change" : `CHANGED to ${JSON.stringify(after)}`);
}

async function removeMadeRows() {
  if (madeGrantIds.size) await service.schema("iam").from("permissions").delete().in("id", [...madeGrantIds]);
  if (madeLinkIds.size) await service.schema("platform").from("share_links").delete().in("id", [...madeLinkIds]);
  madeGrantIds.clear();
  madeLinkIds.clear();
  if (!madeIds.size) return;
  const ids = [...madeIds];
  const { error } = await service.schema("content_ir").from(TABLE).delete().in("id", ids);
  if (error) throw new Error(`cleanup FAILED for ${ids.join(",")}: ${error.message}`);
  console.log(`cleanup: removed ${ids.length} row(s)`);
  madeIds.clear();
}

async function body({ fx, bUser, member }) {
  const X = fx.organizationId;
  const A = await signedIn(fx.owner);
  const C = await signedIn(fx.admin);
  const M = await signedIn(member);
  const B = await signedIn(bUser);
  const aId = fx.owner.id;
  const cId = fx.admin.id;
  const bOrgs = await myOrgIds(B);
  if (bOrgs.includes(X)) throw new Error("persona B is unexpectedly a member of X");

  // ---- 0: the write barrier exists -----------------------------------------------------------
  const { data: guard, error: guardErr } = await service.schema("content_ir").rpc("kind_component_layer_guard_status");
  if (guardErr) throw new Error(`guard status read failed: ${guardErr.message}`);
  for (const [k, v] of Object.entries(guard ?? {})) check(`0. guard in place: ${k}`, v === true);

  // ---- 1 + 4: A's user row ------------------------------------------------------------------
  const mine = await insert(A, row({ organization_id: X, audience_user_id: aId, notes: "A's view" }));
  check("1. A writes a user-layer row for themself", !!mine.data && !mine.error, mine.error?.message);
  const mineId = mine.data?.id;
  if (!mineId) throw new Error("A's row was not written; nothing below can run");
  const expectedAuthor = PLANTS.has("wrong_author") ? cId : aId;
  check("4. created_by on A's user row is A", mine.data?.created_by === expectedAuthor, `created_by=${mine.data?.created_by}`);

  const bRead = await readById(B, mineId);
  check("1. B (other org) cannot read A's user row", bRead.rows.length === 0, `${bRead.rows.length} row(s)`);
  const anonRead = await readById(anon, mineId);
  check("1. anon cannot read A's user row", anonRead.rows.length === 0, anonRead.error ? `refused: ${anonRead.error.code}` : `${anonRead.rows.length} row(s)`);
  const cScoped = await scopedRead(C, cId, await myOrgIds(C));
  check("1. coworker C's scoped layer read does not return A's user row", !cScoped.includes(mineId), `${cScoped.length} row(s) returned`);
  const aScoped = await scopedRead(A, aId, await myOrgIds(A));
  check("1. A's own scoped layer read returns A's user row", aScoped.includes(mineId));

  const base = await truth(mineId);
  for (const [who, client] of [["coworker admin C", C], ["plain member M", M]]) {
    await unchanged(`1. ${who} cannot update A's user row`, base, layer(client).update({ notes: `${who} edit` }).eq("id", mineId).select("id"));
    await unchanged(
      `1. ${who} cannot upsert onto A's unique key`,
      base,
      layer(client)
        .upsert(row({ organization_id: X, audience_user_id: aId, notes: `${who} upsert` }), { onConflict: "kind,platform,role,audience_user_id" })
        .select("id"),
    );
    await unchanged(
      `1. ${who} cannot upsert onto A's row id`,
      base,
      layer(client).upsert({ ...row({ organization_id: X, audience_user_id: aId, notes: `${who} upsert by id` }), id: mineId }, { onConflict: "id" }).select("id"),
    );
    await unchanged(`1. ${who} cannot soft-delete A's user row (entity_soft_delete)`, base, client.rpc("entity_soft_delete", { p_token: TOKEN, p_id: mineId }));
    await unchanged(`1. ${who} cannot restore A's user row (version_restore)`, base, client.rpc("version_restore", { p_token: TOKEN, p_id: mineId, p_version: 1 }));
  }

  // ---- 5: never shared ---------------------------------------------------------------------
  const grant = await service
    .schema("iam")
    .from("permissions")
    .insert({ resource_type: TOKEN, resource_id: mineId, granted_to_user_id: bUser.id, permission_level: "viewer", created_by: aId })
    .select("id")
    .maybeSingle();
  if (grant.data?.id) madeGrantIds.add(grant.data.id);
  check("5. no grant can name a shape view (even from the server)", !!grant.error && !grant.data, grant.error?.code);
  const link = await service
    .schema("platform")
    .from("share_links")
    .insert({ resource_type: TOKEN, resource_id: mineId, token: randomBytes(32).toString("hex"), permission_level: "viewer", created_by: aId, organization_id: X })
    .select("id")
    .maybeSingle();
  if (link.data?.id) madeLinkIds.add(link.data.id);
  check("5. no share link can name a shape view (even from the server)", !!link.error && !link.data, link.error?.code);
  const bReadAfterShare = await readById(B, mineId);
  check("5. B still cannot read A's user row after the share attempts", bReadAfterShare.rows.length === 0);

  // ---- 2 + 4: refused writes ----------------------------------------------------------------
  const forB = await insert(A, row({ kind: `${KIND}_b`, organization_id: X, audience_user_id: bUser.id }));
  check("2. A cannot write a user row whose audience is B", !!forB.error && !forB.data, forB.error?.code);
  const spoof = await insert(A, row({ kind: `${KIND}_spoof`, organization_id: X, audience_user_id: aId, created_by: cId }));
  check("4. a payload created_by is ignored: the row's author is A", spoof.data?.created_by === aId, spoof.error?.message ?? `created_by=${spoof.data?.created_by}`);
  const mOrg = await insert(M, row({ kind: `${KIND}_m`, organization_id: X, audience_organization_id: X }));
  check("2. plain member M cannot write an org row for X", !!mOrg.error && !mOrg.data, mOrg.error?.code);
  const bOrg = await insert(B, row({ kind: `${KIND}_bx`, organization_id: X, audience_organization_id: X }));
  check("2. B (not in X) cannot write an org row for X", !!bOrg.error && !bOrg.data, bOrg.error?.code);

  // ---- 3: the org row -----------------------------------------------------------------------
  const orgRow = await insert(C, row({ organization_id: X, audience_organization_id: X }));
  check("2. admin C writes an org row for X", !!orgRow.data && !orgRow.error, orgRow.error?.message);
  const orgId = orgRow.data?.id;
  if (!orgId) throw new Error("C's org row was not written; nothing below can run");
  check("4. created_by on the org row is C", orgRow.data?.created_by === (PLANTS.has("wrong_author") ? aId : cId));
  const mRead = await readById(M, orgId);
  check("3. member M reads X's org row", mRead.rows.length === 1, `${mRead.rows.length} row(s)`);
  const mScoped = await scopedRead(M, member.id, await myOrgIds(M));
  check("3. member M's scoped layer read returns X's org row and not A's user row", mScoped.includes(orgId) && !mScoped.includes(mineId));
  const bReadOrg = await readById(B, orgId);
  check("3. B (not in X) cannot read X's org row", bReadOrg.rows.length === 0, `${bReadOrg.rows.length} row(s)`);
  const anonOrg = await readById(anon, orgId);
  check("3. anon cannot read X's org row", anonOrg.rows.length === 0, anonOrg.error ? `refused: ${anonOrg.error.code}` : `${anonOrg.rows.length} row(s)`);
  const orgBase = await truth(orgId);
  await unchanged("2. plain member M cannot update X's org row", orgBase, layer(M).update({ notes: "member edit" }).eq("id", orgId).select("id"));
  await unchanged("2. plain member M cannot soft-delete X's org row (entity_soft_delete)", orgBase, M.rpc("entity_soft_delete", { p_token: TOKEN, p_id: orgId }));
  const aUpd = await layer(A).update({ notes: "owner edit" }).eq("id", orgId).select("id, created_by");
  check("2. another admin of X (A, the owner) can update X's org row; author stays C", !aUpd.error && aUpd.data?.[0]?.created_by === cId, aUpd.error?.message);
  const move = await layer(C).update({ audience_organization_id: bOrgs[0] }).eq("id", orgId).select("id");
  check("2. the audience of an org row cannot change", !!move.error || (move.data ?? []).length === 0, move.error?.code);
  const moveUser = await layer(A).update({ audience_user_id: cId }).eq("id", mineId).select("id");
  check("2. the audience of a user row cannot change", !!moveUser.error || (moveUser.data ?? []).length === 0, moveUser.error?.code);

  // ---- 1: undelete door, then delete (last: under a plant these succeed and would starve the rest) ----
  const aSoft = await A.rpc("entity_soft_delete", { p_token: TOKEN, p_id: mineId });
  const trashed = await truth(mineId);
  check("1. A can soft-delete A's own user row (entity_soft_delete)", !aSoft.error && !!trashed?.deleted_at, aSoft.error?.message);
  await unchanged("1. coworker admin C cannot undelete A's user row (entity_undelete)", trashed, C.rpc("entity_undelete", { p_token: TOKEN, p_id: mineId }));
  await unchanged("1. plain member M cannot undelete A's user row (entity_undelete)", trashed, M.rpc("entity_undelete", { p_token: TOKEN, p_id: mineId }));
  const aUndo = await A.rpc("entity_undelete", { p_token: TOKEN, p_id: mineId });
  const restored = await truth(mineId);
  check("1. A can undelete A's own user row (entity_undelete)", !aUndo.error && restored?.deleted_at === null, aUndo.error?.message);
  for (const [who, client] of [["coworker admin C", C], ["plain member M", M]]) {
    const del = await layer(client).delete().eq("id", mineId).select("id");
    const still = await truth(mineId);
    check(`1. ${who} cannot delete A's user row`, !!still, del.error?.code ?? (still ? "no change" : "DELETED"));
  }
}

let failedHard = false;
const made = { fx: null, bUser: null, member: null, membershipId: null };
const t0 = Date.now();
const stamp = (what) => console.log(`[${formatDurationMs(Date.now() - t0, { style: "compact" })}] ${what}`);
try {
  // Personas in parallel: each one is a separate sweeper-backed door and takes a while.
  const [fx, bUser, member] = await Promise.all([
    createOrgAdminFixture(target, { suite: SUITE, purpose: "shape view layer RLS (org X)" }),
    createFixtureUser(target, { suite: SUITE, purpose: "shape view layer RLS (other-org person B)" }),
    createFixtureUser(target, { suite: SUITE, purpose: "shape view layer RLS (plain member M of X)" }),
  ]);
  Object.assign(made, { fx, bUser, member });
  const X = fx.organizationId;
  const { data: ms, error: msErr } = await service
    .schema("iam")
    .from("memberships")
    .insert({ organization_id: X, container_type: "organization", container_id: X, user_id: member.id, role: "member", status: "active", created_by: fx.owner.id })
    .select("id")
    .single();
  if (msErr) throw new Error(`could not seat the plain member: ${msErr.message}`);
  made.membershipId = ms.id;
  stamp("personas ready");
  await body({ fx, bUser, member });
  stamp("assertions done");
} catch (error) {
  failedHard = true;
  console.error(`ERROR  ${error.message}`);
} finally {
  // Rows first: created_by references the personas, so their teardown needs these gone.
  await removeMadeRows().catch((e) => { failedHard = true; console.error(e.message); });
  const { count, error: countErr } = await service.schema("content_ir").from(TABLE).select("id", { count: "exact", head: true }).like("kind", "zz_layer_probe_%");
  check("cleanup: no probe rows left behind", !countErr && count === 0, countErr?.message ?? `${count} left`);
  if (made.membershipId) await service.schema("iam").from("memberships").delete().eq("id", made.membershipId);
  // One sweeper pass for every persona (the org-admin fixture made no workflow rows, so its two
  // accounts are all deleteOrgAdminFixture would remove).
  const ids = [made.fx?.owner.id, made.fx?.admin.id, made.bUser?.id, made.member?.id].filter(Boolean);
  if (ids.length) {
    await deleteFixtureUsers(target, ids).catch((e) => { failedHard = true; console.error(`teardown: ${e.message}`); });
  }
  stamp(`personas removed (${ids.length})`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${PLANT ? `  (PLANT=${PLANT})` : ""}`);
process.exit(failed || failedHard ? 1 : 0);
