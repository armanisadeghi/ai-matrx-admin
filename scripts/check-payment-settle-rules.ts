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
 *   I2  a second pending payment for the same record is refused (23505) — one live session per record
 *
 *   pnpm check:payment-settle-rules
 */
import { loadDbEnv } from "./lib/direct-db";
import { withGateDb } from "./lib/gate-db";
import { exitAfterDrain } from "./lib/exit-after-drain";
import type pg from "pg";

/** The Ashford Labs booking ask (disabled) and one of its records — the test fixture of PAYMENTS-CONNECT-2. */
const ASK = "25af55b9-c9db-4e60-925a-cd1db1fbf005";
const RECORD = "ae4c110c-cf55-4acc-96dc-bd10ddd34802";

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
