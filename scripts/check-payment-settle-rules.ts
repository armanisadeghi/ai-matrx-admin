/**
 * BUSINESS PAYMENTS: THE SETTLE RULES, PROVEN ON THE LIVE FUNCTIONS (REVIEW-PAYMENTS, 2026-10-18).
 *
 * Every scenario runs inside ONE transaction that is always ROLLED BACK: it inserts throwaway
 * billing.payment rows for a real record and calls the real billing.payment_settle, then reads
 * what the record's Payment field says. Nothing survives the run.
 *
 *   I1  an older session expiring after a newer one was paid never flips the record off Paid
 *   I1b an older session failing after a newer one was paid never flips the record off Paid
 *   I1c the record's own current payment expiring still says Unpaid
 *   M1  a partial refund keeps the payment paid and says "Partially refunded 10.00 USD"; the rest makes it Refunded
 *   M3  an amount from a question the public form asks is refused at save
 *   M3p an amount from a field a portal client can change is refused at save (and accepted when read-only)
 *   I2  a second pending payment for the same record is refused (23505) — one live session per record
 *
 *   pnpm check:payment-settle-rules
 */
import { loadDbEnv } from "./lib/direct-db";
import { withGateDb } from "./lib/gate-db";
import { exitAfterDrain } from "./lib/exit-after-drain";
import type pg from "pg";

/**
 * The fixture is FOUND, never pinned (PAYMENTS-FINAL): a pinned record was archived by a walk's cleanup and
 * every record-word scenario went red on a deleted record. The newest live ask whose table still has its
 * Payment field and a live record is used; none at all is UNMEASURED, not green.
 */
let ASK = "";
let RECORD = "";
const FIXTURE_SQL = `
  select a.id as ask, r.id as record
    from billing.payment_ask a
    join custom.record r on r.table_id = a.table_id and r.organization_id = a.organization_id and r.deleted_at is null
   where a.deleted_at is null
     and exists (select 1 from custom.field f where f.entity_definition_id = a.table_id and f.key = a.status_field_key)
   order by a.created_at desc, r.created_at desc
   limit 1`;

/** Admin of the Ashford Labs organization (admin@admin.com), its form ask's table, and its one portal. */
const ADMIN = "87a6e699-3622-4869-8843-d0867456c0dd";
const ORG = "c19a81b7-f65f-4c01-b04c-00f97f8b7e4d";
const PORTAL_TABLE_ROW = "1c8c1fcf-6d9e-4eaf-bbb8-43f5a396b1d2";
const PRICE_TABLE = "f282a7f1-4fab-4741-84fb-fee1304025c1";

/** As the admin, inside the scenario's rolled-back transaction: an open portal shows PRICE_TABLE with `editable`. */
async function portalEdits(db: pg.Client, editable: string[]): Promise<string> {
  await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ADMIN, role: "authenticated" })]);
  await db.query("update custom.portal set archived_at = null where id = (select portal_id from custom.portal_table where id = $1)", [PORTAL_TABLE_ROW]);
  const { rowCount } = await db.query(
    "update custom.portal_table set table_id = $2, editable_field_keys = $3::jsonb where id = $1",
    [PORTAL_TABLE_ROW, PRICE_TABLE, JSON.stringify(editable)],
  );
  if (rowCount !== 1) throw new Error("the portal fixture row is gone");
  await db.query("savepoint m3p");
  try {
    await db.query("select billing.payment_ask_set($1, 'table', $2, $3::jsonb)", [
      ORG, PRICE_TABLE, JSON.stringify({ enabled: false, amount_mode: "field", amount_field: "value", currency: "usd" }),
    ]);
    return "accepted";
  } catch (thrown) {
    await db.query("rollback to savepoint m3p");
    return (thrown as { code?: string }).code === "22023" ? "refused" : `error ${(thrown as Error).message}`;
  }
}

interface Scenario {
  name: string;
  /** Resolves to an outcome word that replaces the record's word, when the scenario measures something else. */
  run: (db: pg.Client, pay: (session: string, status: string, ageMinutes: number) => Promise<void>) => Promise<string | void>;
  expect: string;
}

const SCENARIOS: Scenario[] = [
  {
    name: "I1  old session expires after a newer one was paid -> record stays Paid",
    run: async (db, pay) => {
      // (the one-pending index means the newer row is settled before the older pending row exists here)
      await pay("cs_rule_new", "pending", 1);
      await db.query("select billing.payment_settle('cs_rule_new', 'paid', 'pi_rule_new')");
      await pay("cs_rule_old", "pending", 30);
      await db.query("select billing.payment_settle('cs_rule_old', 'expired', null)");
    },
    expect: "Paid",
  },
  {
    name: "I1b old session fails after a newer one was paid -> record stays Paid",
    run: async (db, pay) => {
      // (the one-pending index means the newer row is settled before the older pending row exists here)
      await pay("cs_rule_new", "pending", 1);
      await db.query("select billing.payment_settle('cs_rule_new', 'paid', 'pi_rule_new')");
      await pay("cs_rule_old", "pending", 30);
      await db.query("select billing.payment_settle('cs_rule_old', 'failed', null)");
    },
    expect: "Paid",
  },
  {
    name: "I1c the record's current session expires -> record says Unpaid",
    run: async (db, pay) => {
      await db.query("update billing.payment set deleted_at = now() where record_id = $1", [RECORD]);
      await pay("cs_rule_only", "pending", 1);
      await db.query("select billing.payment_settle('cs_rule_only', 'expired', null)");
    },
    expect: "Unpaid",
  },
  {
    name: "M1  a partial refund says Partially refunded with the amount",
    run: async (db, pay) => {
      await db.query("update billing.payment set deleted_at = now() where record_id = $1", [RECORD]);
      await pay("cs_rule_refund", "pending", 1);
      await db.query("select billing.payment_settle('cs_rule_refund', 'paid', 'pi_rule_refund')");
      await db.query("select billing.payment_refund('pi_rule_refund', 1000)");
    },
    expect: "Partially refunded 10.00 USD",
  },
  {
    name: "M1b the rest of the refund makes the record Refunded",
    run: async (db, pay) => {
      await db.query("update billing.payment set deleted_at = now() where record_id = $1", [RECORD]);
      await pay("cs_rule_refund", "pending", 1);
      await db.query("select billing.payment_settle('cs_rule_refund', 'paid', 'pi_rule_refund')");
      await db.query("select billing.payment_refund('pi_rule_refund', 1000)");
      await db.query("select billing.payment_refund('pi_rule_refund', 4000)");
    },
    expect: "Refunded",
  },
  {
    name: "M1c a full refund that arrives BEFORE the paid settle still ends Refunded",
    run: async (db, pay) => {
      await db.query("update billing.payment set deleted_at = now() where record_id = $1", [RECORD]);
      await pay("cs_rule_early", "pending", 1);
      await db.query("update billing.payment set stripe_payment_intent_id = 'pi_rule_early' where stripe_checkout_session_id = 'cs_rule_early'");
      await db.query("select billing.payment_refund('pi_rule_early', 4000)");
      await db.query("select billing.payment_settle('cs_rule_early', 'paid', 'pi_rule_early')");
      const { rows } = await db.query("select status from billing.payment where stripe_checkout_session_id = 'cs_rule_early'");
      return `${(rows[0] as { status: string }).status}`;
    },
    expect: "refunded",
  },
  {
    name: "M1d a partial refund that arrives BEFORE the paid settle shows on the record",
    run: async (db, pay) => {
      await db.query("update billing.payment set deleted_at = now() where record_id = $1", [RECORD]);
      await pay("cs_rule_early", "pending", 1);
      await db.query("update billing.payment set stripe_payment_intent_id = 'pi_rule_early' where stripe_checkout_session_id = 'cs_rule_early'");
      await db.query("select billing.payment_refund('pi_rule_early', 1000)");
      await db.query("select billing.payment_settle('cs_rule_early', 'paid', 'pi_rule_early')");
    },
    expect: "Partially refunded 10.00 USD",
  },
  {
    name: "M3  an amount taken from a question the payer answers is refused at save",
    run: async (db) => {
      // As the admin who owns the Ashford Labs form ask; the form asks "usage_note".
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: "87a6e699-3622-4869-8843-d0867456c0dd", role: "authenticated" })]);
      await db.query("savepoint m3");
      try {
        await db.query(
          "select billing.payment_ask_set('c19a81b7-f65f-4c01-b04c-00f97f8b7e4d', 'form', '15c126ea-f561-4c7c-98ed-925a517612cd', $1::jsonb)",
          [JSON.stringify({ enabled: false, amount_mode: "field", amount_field: "usage_note", currency: "usd" })],
        );
        return "accepted";
      } catch (thrown) {
        await db.query("rollback to savepoint m3");
        return (thrown as { code?: string }).code === "22023" ? "refused" : `error ${(thrown as Error).message}`;
      }
    },
    expect: "refused",
  },
  {
    name: "M3p an amount taken from a field a portal client can change is refused at save",
    run: (db) => portalEdits(db, ["value"]),
    expect: "refused",
  },
  {
    name: "M3p-ok the same amount field, read-only on the portal, is accepted",
    run: (db) => portalEdits(db, []),
    expect: "accepted",
  },
  {
    name: "I2  a second pending payment for one record is refused",
    run: async (db, pay) => {
      await pay("cs_rule_a", "pending", 2);
      await db.query("savepoint second");
      try {
        await pay("cs_rule_b", "pending", 1);
      } catch (thrown) {
        if ((thrown as { code?: string }).code !== "23505") throw thrown;
        await db.query("rollback to savepoint second");
        return "refused-second";
      }
      return "second-accepted";
    },
    expect: "refused-second",
  },
];

async function main(): Promise<number> {
  const env = loadDbEnv();
  if ("missing" in env) {
    console.error(`[FAIL] UNMEASURED: database variables missing (${env.missing.join(", ")})`);
    return 1;
  }
  return withGateDb(env, { gate: "check:payment-settle-rules" }, async (db) => {
    const { rows: fixture } = await db.query(FIXTURE_SQL);
    if (!fixture[0]) {
      console.error("[FAIL] UNMEASURED: no live payment ask has a live record and its Payment field to settle against");
      return 1;
    }
    ({ ask: ASK, record: RECORD } = fixture[0] as { ask: string; record: string });
    let failed = 0;
    for (const s of SCENARIOS) {
      await db.query("begin");
      try {
        const { rows } = await db.query("select organization_id, stripe_account_id from billing.org_payment_account limit 1");
        const acct = rows[0] as { organization_id: string; stripe_account_id: string };
        const pay = async (session: string, status: string, ageMinutes: number) => {
          await db.query(
            `insert into billing.payment (organization_id, ask_id, subject_kind, subject_id, record_id, amount_cents, currency,
               stripe_account_id, livemode, stripe_checkout_session_id, status, created_at)
             select a.organization_id, a.id, a.subject_kind, a.subject_id, $2, 4000, 'usd', $3, false, $4, $5, now() - make_interval(mins => $6)
               from billing.payment_ask a where a.id = $1`,
            [ASK, RECORD, acct.stripe_account_id, session, status, ageMinutes],
          );
        };
        const outcome = await s.run(db, pay);
        const { rows: rec } = await db.query("select data->>'payment' as word from custom.record where id = $1", [RECORD]);
        const word = outcome ?? (rec[0] as { word: string | null } | undefined)?.word ?? null;
        if (word === s.expect) console.log(`[ OK ] ${s.name}`);
        else {
          failed++;
          console.error(`[FAIL] ${s.name} — record says ${JSON.stringify(word)}`);
        }
      } catch (thrown) {
        failed++;
        console.error(`[FAIL] ${s.name} — ${thrown instanceof Error ? thrown.message : thrown}`);
      } finally {
        await db.query("rollback");
      }
    }
    return failed ? 1 : 0;
  });
}

main().then(exitAfterDrain).catch((e) => {
  console.error("[FAIL]", e instanceof Error ? e.message : e);
  exitAfterDrain(1);
});
