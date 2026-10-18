/**
 * THE PAYMENT TABLES TAKE NO CLIENT WRITES (REVIEW-PAYMENTS C1, 2026-10-18).
 *
 * billing.org_payment_account, billing.payment_ask and billing.payment are created by
 * platform.create_entity_table, whose defaults grant INSERT/UPDATE/DELETE to `authenticated`.
 * With those grants a plain org member could lower a fixed price, repoint the organization's
 * Stripe account, or mark a payment paid straight from supabase-js. Writes belong to the server
 * (service role) and the SECURITY DEFINER doors only. A rebuild of any of these tables re-grants
 * by default, so this gate measures the live catalog every time:
 *
 *   1. CATALOG: no client role (authenticated, anon, PUBLIC) holds INSERT, UPDATE, DELETE or
 *      TRUNCATE on the three tables (has_table_privilege, so PUBLIC and role inheritance count).
 *   2. PROBE: as `authenticated` with a real org member's claims, an UPDATE (where false) on each
 *      table is refused 42501, inside a transaction that is always rolled back. Nothing is written.
 *
 *   pnpm check:payment-tables-no-client-writes
 *   pnpm check:payment-tables-no-client-writes --self-test   # the pure rule goes RED on a granted row
 *
 * UNMEASURED IS NOT PASSED: no credentials or an unreachable database exits 1.
 */
import { loadDbEnv } from "./lib/direct-db";
import { withGateDb } from "./lib/gate-db";
import { exitAfterDrain } from "./lib/exit-after-drain";

export const PAYMENT_TABLES = ["billing.org_payment_account", "billing.payment_ask", "billing.payment"] as const;
export const CLIENT_ROLES = ["authenticated", "anon"] as const;
export const WRITE_PRIVILEGES = ["INSERT", "UPDATE", "DELETE", "TRUNCATE"] as const;

/** A member of the Ashford Labs test org (role member). Claims only; the probe writes nothing. */
const PROBE_MEMBER = "4060701e-706a-4c76-b3ca-0bbc69fa5a14";

export interface GrantRow {
  table: string;
  role: string;
  privilege: string;
  granted: boolean;
}

/** THE PURE RULE: every granted client write is a finding. */
export function clientWriteFindings(rows: readonly GrantRow[]): string[] {
  return rows.filter((r) => r.granted).map((r) => `${r.role} holds ${r.privilege} on ${r.table}`);
}

function selfTest(): number {
  const red = clientWriteFindings([
    { table: "billing.payment", role: "authenticated", privilege: "UPDATE", granted: true },
    { table: "billing.payment", role: "anon", privilege: "UPDATE", granted: false },
  ]);
  const green = clientWriteFindings([{ table: "billing.payment", role: "authenticated", privilege: "UPDATE", granted: false }]);
  const ok = red.length === 1 && red[0] === "authenticated holds UPDATE on billing.payment" && green.length === 0;
  console.log(ok ? "[ OK ] self-test: a granted client write is RED, a withdrawn one is GREEN" : "[FAIL] self-test: the rule does not see a granted write");
  return ok ? 0 : 1;
}

async function main(): Promise<number> {
  if (process.argv.includes("--self-test")) return selfTest();
  const env = loadDbEnv();
  if ("missing" in env) {
    console.error(`[FAIL] UNMEASURED: database variables missing (${env.missing.join(", ")}); looked in ${env.looked.join(", ")}`);
    return 1;
  }
  return withGateDb(env, { gate: "check:payment-tables-no-client-writes" }, async (db) => {
    const rows: GrantRow[] = [];
    for (const table of PAYMENT_TABLES) {
      for (const role of CLIENT_ROLES) {
        for (const privilege of WRITE_PRIVILEGES) {
          const { rows: r } = await db.query("select has_table_privilege($1, $2::regclass, $3) as granted", [role, table, privilege]);
          rows.push({ table, role, privilege, granted: Boolean((r[0] as { granted: boolean }).granted) });
        }
      }
    }
    const findings = clientWriteFindings(rows);
    if (rows.length !== PAYMENT_TABLES.length * CLIENT_ROLES.length * WRITE_PRIVILEGES.length) {
      console.error("[FAIL] UNMEASURED: the catalog census came back short");
      return 1;
    }

    const refused: string[] = [];
    const accepted: string[] = [];
    for (const table of PAYMENT_TABLES) {
      await db.query("begin");
      try {
        await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: PROBE_MEMBER, role: "authenticated" })]);
        await db.query("set local role authenticated");
        await db.query(`update ${table} set updated_at = updated_at where false`);
        accepted.push(table);
      } catch (thrown) {
        const code = (thrown as { code?: string }).code;
        if (code === "42501") refused.push(table);
        else throw thrown;
      } finally {
        await db.query("rollback");
      }
    }

    for (const f of findings) console.error(`[FAIL] ${f}`);
    for (const t of accepted) console.error(`[FAIL] a member's UPDATE on ${t} was accepted (probe rolled back)`);
    for (const t of refused) console.log(`[ OK ] a member's UPDATE on ${t} is refused 42501`);
    if (findings.length || accepted.length) return 1;
    console.log(`[ OK ] no client write grant on ${PAYMENT_TABLES.join(", ")} (${rows.length} privileges checked)`);
    return 0;
  });
}

main().then(exitAfterDrain).catch((e) => {
  console.error("[FAIL]", e instanceof Error ? e.message : e);
  exitAfterDrain(1);
});
