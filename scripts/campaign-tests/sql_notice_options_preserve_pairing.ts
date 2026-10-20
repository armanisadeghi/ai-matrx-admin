/** Real SQL-producer proof. Live is DML-only; replacing bodies is a quarantined-clone rehearsal. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { connectCheckDirect } from "../lib/check-target";
const root = resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2);
const targetAt = args.indexOf("--target");
const target = targetAt >= 0 ? args[targetAt + 1] : undefined;
const baseline = args.includes("--baseline");
const candidateAt = args.indexOf("--candidate");
const candidate = candidateAt >= 0 ? args[candidateAt + 1] : undefined;
const bodyOnly = args.includes("--body-only");
if (target !== "production" && target !== "clone")
  throw Error("Name --target production or --target clone explicitly.");
if (!baseline && (target !== "clone" || !candidate))
  throw Error(
    "Candidate DDL is a clone rehearsal: use --target clone --candidate <file>.",
  );
if (baseline && (candidate || bodyOnly))
  throw Error("--baseline never loads a candidate or DDL.");
const snapshotSql = `select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition,
  p.proacl::text as acl, obj_description(p.oid,'pg_proc') as description
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='communication' and p.proname='notify_from_sql' order by p.pronargs`;
async function main() {
  const { client } = await connectCheckDirect({
    gate: "sql-notice-options-preserve-pairing",
    argv: args,
  });
  let before = "",
    doorBefore = "",
    fixtureEvent = "",
    proofError: unknown;
  try {
    before = JSON.stringify((await client.query(snapshotSql)).rows);
    if (JSON.parse(before).length !== 2)
      throw Error("Exactly two canonical producer overloads required.");
    doorBefore = JSON.stringify(
      (
        await client.query(`select to_jsonb(d) as row from platform.client_callable_door d
      where schema_name='communication' and function_name='notify_from_sql' order by identity_args`)
      ).rows,
    );
    await client.query("begin");
    await client.query(
      "set local statement_timeout='15s'; set local lock_timeout='2s'; set local idle_in_transaction_session_timeout='20s'",
    );
    await client.query(
      "select set_config('communications.notice_options_proof','',true)",
    );
    if (candidate) {
      const sql = readFileSync(resolve(root, candidate), "utf8");
      if (bodyOnly) {
        const bodies = sql.match(
          /create or replace function communication\.notify_from_sql\([\s\S]*?\$function\$;/gi,
        );
        if (!bodies || bodies.length !== 2)
          throw Error("Candidate must contain both producer overloads.");
        for (const body of bodies) await client.query(body);
      } else {
        await client.query(sql);
        await client.query(sql); // A previously registered server door must not make replay fail.
      }
    }
    await client.query(
      readFileSync(
        resolve(import.meta.dirname, "sql_notice_options_preserve_pairing.sql"),
        "utf8",
      ),
    );
    const proof = await client.query(
      "select current_setting('communications.notice_options_proof',true) as result, current_setting('communications.notice_options_event',true) as event_key",
    );
    fixtureEvent = proof.rows[0]?.event_key ?? "";
    if (proof.rows[0]?.result !== "passed")
      throw Error("SQL behavior assertions did not complete.");
  } catch (error) {
    proofError = error;
  } finally {
    try {
      await client.query("rollback");
      if (fixtureEvent) {
        const cleanup = await client.query(
          "select (select count(*) from communication.notification where event_key=$1) + (select count(*) from communication.notification_event_type where event_key=$1) + (select count(*) from communication.notification_preference where event_key=$1) as remaining",
          [fixtureEvent],
        );
        if (Number(cleanup.rows[0]?.remaining) !== 0)
          throw Error("Disposable notification fixture survived rollback.");
      }
      if (
        before &&
        JSON.stringify((await client.query(snapshotSql)).rows) !== before
      )
        throw Error(
          "Producer definitions, ACL or comments changed after rollback.",
        );
      if (
        doorBefore &&
        JSON.stringify(
          (
            await client.query(`select to_jsonb(d) as row from platform.client_callable_door d
        where schema_name='communication' and function_name='notify_from_sql' order by identity_args`)
          ).rows,
        ) !== doorBefore
      )
        throw Error("Server door metadata changed after rollback.");
    } finally {
      await client.end();
    }
  }
  if (proofError) throw proofError;
  console.log(
    "PASS: real producer pairing, two-way opt-outs, DM metadata, replay and legacy delegation; all DDL/rows rolled back; definitions/ACL/door unchanged.",
  );
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "SQL producer proof failed",
  );
  process.exitCode = 1;
});
