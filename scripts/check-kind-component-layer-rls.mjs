// scripts/check-kind-component-layer-rls.mjs — live safety test for content_ir.kind_component_layer
// (shape layers slice 1, common-docs/systems/architecture/content-ir/projects/shape-layers/PLAN.md).
//
//   node --env-file=.env.local scripts/check-kind-component-layer-rls.mjs
//
// Real people on the LIVE database, over the real REST door, made by the persona factory (tagged,
// expiring, torn down in `finally`):
//   A  = owner of organization X        C = admin of X (A's coworker)
//   M  = plain member of X              B = a person in another organization
// Invariants (owner ruling 2026-10-14: the table is Organization class, so a coworker MAY read a
// user row at the database; what matters is the scoped layer read and who may write):
//   1. A user-layer row is never returned by the scoped layer read for anyone but its audience user,
//      and never writable by anyone but its author. B (other org) and anon read nothing.
//   2. Nobody writes a user row for someone else, or an org row for an org they do not administer.
//      Audience columns never change.
//   3. Org members read an org row; a non-member does not.
//   4. created_by is the author, whatever the payload says.
// Exit 1 on any failed assertion. Every row this run makes is hard-deleted in `finally`.
//
// Client-side plants (prove an assertion can fail without touching the database):
//   PLANT=unscoped_read     the coworker's layer read drops its audience predicate
//   PLANT=wrong_author      assertion 4 expects the coworker as author
//   PLANT=anon_key          the anonymous reader holds a key that can read (the DB refuses a real anon grant)
// Several at once: PLANT=unscoped_read,wrong_author,anon_key
// Database-side plants are applied by hand around a run (see the slice-1 note in PLAN.md).
import { createClient } from "@supabase/supabase-js";
import {
  testTarget,
  withFixtureUser,
  withOrgAdminFixture,
  createFixtureUser,
  deleteFixtureUser,
  fixtureSessionCookies,
} from "./lib/persona.mjs";

const SUITE = "content-ir/shape-layers";
const TABLE = "kind_component_layer";
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

/** The scoped layer read every renderer must use (PLAN v2 "Reads declare their own scope"). */
async function scopedRead(client, uid, orgIds) {
  let q = layer(client).select("id").eq("kind", KIND).is("deleted_at", null);
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

async function removeMadeRows() {
  if (!madeIds.size) return;
  const ids = [...madeIds];
  const { error } = await service.schema("content_ir").from(TABLE).delete().in("id", ids);
  if (error) throw new Error(`cleanup FAILED for ${ids.join(",")}: ${error.message}`);
  console.log(`cleanup: removed ${ids.length} row(s)`);
  madeIds.clear();
}

let failedHard = false;
let member = null;
let memberMembershipId = null;
try {
  await withOrgAdminFixture(target, { suite: SUITE, purpose: "shape view layer RLS (org X)" }, async (fx) => {
    await withFixtureUser(target, { suite: SUITE, purpose: "shape view layer RLS (other-org person B)" }, async (bUser) => {
      const X = fx.organizationId;
      member = await createFixtureUser(target, { suite: SUITE, purpose: "shape view layer RLS (plain member M of X)" });
      const { data: ms, error: msErr } = await service
        .schema("iam")
        .from("memberships")
        .insert({ organization_id: X, container_type: "organization", container_id: X, user_id: member.id, role: "member", status: "active", created_by: fx.owner.id })
        .select("id")
        .single();
      if (msErr) throw new Error(`could not seat the plain member: ${msErr.message}`);
      memberMembershipId = ms.id;

      try {
      const A = await signedIn(fx.owner);
      const C = await signedIn(fx.admin);
      const M = await signedIn(member);
      const B = await signedIn(bUser);
      const aId = fx.owner.id;
      const cId = fx.admin.id;
      const bOrgs = await myOrgIds(B);
      if (bOrgs.includes(X)) throw new Error("persona B is unexpectedly a member of X");

      // ---- 1 + 4: A's user row ------------------------------------------------------------
      const mine = await insert(A, row({ organization_id: X, audience_user_id: aId }));
      check("1. A writes a user-layer row for themself", !!mine.data && !mine.error, mine.error?.message);
      const mineId = mine.data?.id;
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

      const cUpd = await layer(C).update({ notes: "coworker edit" }).eq("id", mineId).select("id");
      check("1. coworker C cannot update A's user row", !!cUpd.error || (cUpd.data ?? []).length === 0, cUpd.error?.message);

      // ---- 2 + 4: refused writes ----------------------------------------------------------
      const forB = await insert(A, row({ kind: `${KIND}_b`, organization_id: X, audience_user_id: bUser.id }));
      check("2. A cannot write a user row whose audience is B", !!forB.error && !forB.data, forB.error?.code);
      const spoof = await insert(A, row({ kind: `${KIND}_spoof`, organization_id: X, audience_user_id: aId, created_by: cId }));
      check("4. a payload created_by is ignored: the row's author is A", spoof.data?.created_by === aId, spoof.error?.message ?? `created_by=${spoof.data?.created_by}`);
      const mOrg = await insert(M, row({ kind: `${KIND}_m`, organization_id: X, audience_organization_id: X }));
      check("2. plain member M cannot write an org row for X", !!mOrg.error && !mOrg.data, mOrg.error?.code);
      const bOrg = await insert(B, row({ kind: `${KIND}_bx`, organization_id: X, audience_organization_id: X }));
      check("2. B (not in X) cannot write an org row for X", !!bOrg.error && !bOrg.data, bOrg.error?.code);

      // ---- 3: the org row -----------------------------------------------------------------
      const orgRow = await insert(C, row({ organization_id: X, audience_organization_id: X }));
      check("2. admin C writes an org row for X", !!orgRow.data && !orgRow.error, orgRow.error?.message);
      const orgId = orgRow.data?.id;
      check("4. created_by on the org row is C", orgRow.data?.created_by === (PLANTS.has("wrong_author") ? aId : cId));
      const mRead = await readById(M, orgId);
      check("3. member M reads X's org row", mRead.rows.length === 1, `${mRead.rows.length} row(s)`);
      const mScoped = await scopedRead(M, member.id, await myOrgIds(M));
      check("3. member M's scoped layer read returns X's org row and not A's user row", mScoped.includes(orgId) && !mScoped.includes(mineId));
      const bReadOrg = await readById(B, orgId);
      check("3. B (not in X) cannot read X's org row", bReadOrg.rows.length === 0, `${bReadOrg.rows.length} row(s)`);
      const anonOrg = await readById(anon, orgId);
      check("3. anon cannot read X's org row", anonOrg.rows.length === 0, anonOrg.error ? `refused: ${anonOrg.error.code}` : `${anonOrg.rows.length} row(s)`);
      const mUpd = await layer(M).update({ notes: "member edit" }).eq("id", orgId).select("id");
      check("2. plain member M cannot update X's org row", !!mUpd.error || (mUpd.data ?? []).length === 0, mUpd.error?.code);
      const aUpd = await layer(A).update({ notes: "owner edit" }).eq("id", orgId).select("id, created_by");
      check("2. another admin of X (A, the owner) can update X's org row; author stays C", !aUpd.error && aUpd.data?.[0]?.created_by === cId, aUpd.error?.message);
      const move = await layer(C).update({ audience_organization_id: bOrgs[0] }).eq("id", orgId).select("id");
      check("2. the audience of an org row cannot change", !!move.error || (move.data ?? []).length === 0, move.error?.code);
      const moveUser = await layer(A).update({ audience_user_id: cId }).eq("id", mineId).select("id");
      check("2. the audience of a user row cannot change", !!moveUser.error || (moveUser.data ?? []).length === 0, moveUser.error?.code);
      // Last: under a planted break this delete succeeds and would starve the checks above of their row.
      const cDel = await layer(C).delete().eq("id", mineId).select("id");
      check("1. coworker C cannot delete A's user row", !!cDel.error || (cDel.data ?? []).length === 0, cDel.error?.message);
      } finally {
        // Rows first: created_by references the personas, so their teardown needs these gone.
        await removeMadeRows();
      }
    });
  });
} catch (error) {
  failedHard = true;
  console.error(`ERROR  ${error.message}`);
} finally {
  await removeMadeRows().catch((e) => { failedHard = true; console.error(e.message); });
  const { count } = await service.schema("content_ir").from(TABLE).select("id", { count: "exact", head: true }).like("kind", "zz_layer_probe_%");
  console.log(`probe rows left: ${count ?? "?"}`);
  if (memberMembershipId) await service.schema("iam").from("memberships").delete().eq("id", memberMembershipId);
  if (member) await deleteFixtureUser(target, member.id).catch((e) => console.error(e.message));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${PLANT ? `  (PLANT=${PLANT})` : ""}`);
process.exit(failed || failedHard ? 1 : 0);
