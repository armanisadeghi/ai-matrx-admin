/**
 * TWO-ADMIN PROOF — a note about a person is shared with every platform admin (owner ruling,
 * Arman 2026-10-18), and an "Only me" note stays its author's.
 *
 * Inside ONE transaction that is always rolled back (nothing is left behind):
 *   1. admin A (admin@admin.com) writes two notes about the persona test user through admin.add_user_note
 *      (note + edge in one transaction) in an organization A belongs to and B does not —
 *      one shared ("my_team"), one "only_me".
 *   2. admin B (another platform admin, not a member of that organization) lists the person's notes.
 *
 * Green only when: B's read (admin.user_notes) returns A's shared note and NOT A's only-me note,
 * and A's read returns both. It also prints what the old reader (public.assoc_for_targets, org
 * membership) shows B, which is the defect this replaced (B1: zero).
 *
 *   pnpm tsx scripts/check-admin-user-notes-shared.ts
 */
import process from "node:process";
import { connectDirect, loadDbEnv } from "./lib/direct-db";

const PERSONA = "2d1999a6-1890-456c-ba36-0ce992347e0f";
const ADMIN_A = "87a6e699-3622-4869-8843-d0867456c0dd"; // admin@admin.com

async function main() {
  const env = loadDbEnv();
  if ("missing" in env) throw new Error(`database variables missing: ${env.missing.join(", ")}`);
  const db = await connectDirect(env, "check-admin-user-notes-shared");
  const failures: string[] = [];
  try {
    await db.query("begin");
    // Admin B: another platform admin; the organization: one A belongs to and B does not.
    const pick = await db.query<{ admin_b: string; org: string }>(
      `select b.user_id as admin_b, m.organization_id as org
         from admin.admins b
         join iam.organization_member m on m.user_id = $1
         join iam.organizations o on o.id = m.organization_id and o.archived_at is null and not o.is_system
        where b.user_id <> $1
          and not exists (select 1 from iam.organization_member x
                           where x.user_id = b.user_id and x.organization_id = m.organization_id)
        order by b.user_id, m.organization_id
        limit 1`,
      [ADMIN_A],
    );
    if (!pick.rows[0]) throw new Error("no second platform admin outside one of admin A's organizations");
    const { admin_b: ADMIN_B, org } = pick.rows[0];

    const as = async (uid: string) => {
      await db.query(
        `select set_config('request.jwt.claims', $1, true), set_config('role', 'authenticated', true),
                set_config('matrx.admin_lane', 'on', true)`,
        [JSON.stringify({ sub: uid, role: "authenticated" })],
      );
    };

    await as(ADMIN_A);
    // The old two-call client write (workbench.notes insert + public.assoc_add) is refused for this
    // pair: assoc_add needs viewer access to the person and iam.has_access('user', …) is false for
    // everyone. Measured, then the one-transaction write is used.
    await db.query("savepoint old_write");
    try {
      const n = await db.query<{ id: string }>(
        `insert into workbench.notes (label, content, organization_id, shown_to) values ('probe', 'probe', $1, 'my_team') returning id`,
        [org],
      );
      await db.query(`select public.assoc_add('note', $1::uuid, 'user', $2::uuid, $3::uuid)`, [n.rows[0].id, PERSONA, org]);
      console.log("old write path (notes insert + assoc_add): accepted");
    } catch (e) {
      console.log(`old write path (notes insert + assoc_add): refused — ${e instanceof Error ? e.message : String(e)}`);
    }
    await db.query("rollback to savepoint old_write");
    await as(ADMIN_A);

    const write = async (shownTo: string) => {
      const n = await db.query<{ id: string }>(
        `select admin.add_user_note($1::uuid, $2::uuid, $3, $4::platform.shown_to, 'About persona (two-admin proof)') as id`,
        [PERSONA, org, `two-admin proof ${shownTo}`, shownTo],
      );
      return n.rows[0].id;
    };
    let shared = "";
    let onlyMe = "";
    await db.query("savepoint w");
    try {
      shared = await write("my_team");
      onlyMe = await write("only_me");
    } catch (e) {
      await db.query("rollback to savepoint w");
      failures.push(`admin.add_user_note failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    const readNotes = async (uid: string) => {
      await as(uid);
      const r = await db.query<{ id: string }>(`select id from admin.user_notes($1::uuid)`, [PERSONA]);
      return new Set(r.rows.map((x) => x.id));
    };

    if (!shared) throw new Error(`RED — ${failures.join("; ")}`);
    await as(ADMIN_B);
    const old = await db.query<{ n: string }>(
      `select count(*)::text n from public.assoc_for_targets('user', array[$1::uuid]) e
        where (to_jsonb(e)->>'source_id') in ($2, $3)`,
      [PERSONA, shared, onlyMe],
    );
    console.log(`old reader (assoc_for_targets) shows admin B ${old.rows[0].n} of A's 2 notes`);

    let bSees: Set<string> | null = null;
    let aSees: Set<string> | null = null;
    try {
      await db.query("savepoint s");
      bSees = await readNotes(ADMIN_B);
      aSees = await readNotes(ADMIN_A);
    } catch (e) {
      await db.query("rollback to savepoint s");
      failures.push(`admin.user_notes failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (bSees && aSees) {
      if (!bSees.has(shared)) failures.push("admin B does not see admin A's shared note");
      if (bSees.has(onlyMe)) failures.push("admin B sees admin A's only-me note");
      if (!aSees.has(shared) || !aSees.has(onlyMe)) failures.push("admin A does not see both of their own notes");
      console.log(`admin.user_notes: B sees shared=${bSees.has(shared)} only_me=${bSees.has(onlyMe)}; A sees shared=${aSees.has(shared)} only_me=${aSees.has(onlyMe)}`);
    }
  } finally {
    await db.query("rollback").catch(() => undefined);
    await db.end();
  }
  if (failures.length) {
    console.error(`RED — ${failures.join("; ")}`);
    process.exit(1);
  }
  console.log("GREEN — every platform admin sees a shared note about a person; only-me stays its author's");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
