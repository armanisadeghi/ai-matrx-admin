/**
 * pnpm config:owned-features [--check] [--sql]
 *
 * Which knob features the web app (`ai-matrx`) OWNS for config attestation: exact feature names
 * (`_` escaped — it is a LIKE wildcard; `%` is never used, so a new feature defaults to shared).
 *
 * A feature is owned when every reader of every key in it is in matrx-frontend: no aidream Python,
 * aidream TS app, matrx-sandbox, or in-database (pg_proc) reader. Since 20261016121100 (key-level
 * ownership in platform.config_attestation_status) an attested manifest already owns exactly the
 * keys it declares; this list only scopes which ORPHANS (stored, declared by no app) the web's
 * Attestation tab shows. Orphan detection for a SHARED feature therefore rests on key-level
 * ownership — a shared feature's never-read key is red only where no app's manifest declares it.
 *
 *   --check  exit 1 when the live `app_config.owned_knob_features` differs (the release step's
 *            drift WARNING: another app started reading a feature the web owned, or a new one).
 *   --sql    print the UPDATE for aidream's migration runner.
 */
import {
  AIDREAM_SCAN_DIRS,
  adminQuery,
  collectAidream,
  collectAidreamApps,
  collectSandbox,
  dbReaders,
  scanKnobReads,
  type KnobRow,
} from "../settings-guards/lib";
import { APP, declaredAt, registryAt } from "./lib";

const esc = (f: string) => f.replace(/\\/g, "\\\\").replace(/_/g, "\\_").replace(/%/g, "\\%");

async function owned(): Promise<string[]> {
  const web = declaredAt("WORKTREE");
  const webFeatures = new Set(web.sites.map((s) => s.feature));
  const registry: KnobRow[] = registryAt("WORKTREE");
  const ai = collectAidream(AIDREAM_SCAN_DIRS);
  if (!ai) throw new Error("no aidream checkout: other apps' readers cannot be ruled out, so nothing can be called owned");
  const others = [...ai, ...(collectAidreamApps() ?? []).filter((f) => !/\.generated\.tsx?$/.test(f.rel)), ...(collectSandbox().files ?? [])];
  const elsewhere = new Set(scanKnobReads(others, registry).sites.map((s) => s.feature));
  const inDb = await dbReaders(registry);
  if (!inDb) throw new Error("database readers (pg_proc) could not be read: nothing can be called owned");
  for (const a of inDb.keys()) elsewhere.add(a.split(" ")[0]);
  return [...webFeatures].filter((f) => !elsewhere.has(f)).sort();
}

async function main(): Promise<void> {
  const mine = (await owned()).map(esc);
  if (process.argv.includes("--sql")) {
    const arr = mine.map((f) => `'${f.replace(/'/g, "''")}'`).join(",\n  ");
    console.log(`update public.app_config set owned_knob_features = array[\n  ${arr}\n]::text[] where app = '${APP}';`);
    return;
  }
  if (process.argv.includes("--check")) {
    const res = await adminQuery<{ owned: string[] | null }>(`select owned_knob_features as owned from public.app_config where app = '${APP}'`);
    if (!res.rows) throw new Error(`live owned_knob_features unreadable: ${res.why}`);
    const live = new Set(res.rows[0]?.owned ?? []);
    const want = new Set(mine);
    const add = [...want].filter((f) => !live.has(f));
    const drop = [...live].filter((f) => !want.has(f));
    if (add.length || drop.length) {
      console.log(`owned_knob_features drift for ${APP}: +[${add.join(", ")}] −[${drop.join(", ")}] (regenerate: pnpm config:owned-features --sql, apply through aidream's runner)`);
      process.exit(1);
    }
    console.log(`✓ owned_knob_features for ${APP} match the readers (${mine.length} features)`);
    return;
  }
  console.log(mine.join("\n"));
}

main().catch((error: unknown) => {
  console.error(`✗ config:owned-features — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
});
