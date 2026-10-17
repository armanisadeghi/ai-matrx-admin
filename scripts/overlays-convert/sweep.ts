/**
 * overlays-sweep — opens EVERY registered overlay in a running dev build and records, per id,
 * whether it rendered, hit its error boundary, or logged console errors. The runtime half of the
 * switch proof (R2: "every overlay must open in the app before the controller is deleted").
 *
 *   npx tsx scripts/overlays-convert/sweep.ts --url http://<your-session>.localhost:3001 \
 *       [--route /notes] [--only id1,id2] [--out sweep.json] [--settle 2500] [--headed] [--data data.json]
 *
 * Needs a DEV build (the hook `window.__overlaysTest` is installed by features/overlays/host/
 * OverlayServices.tsx only when NODE_ENV === "development") and signs in as the test admin with
 * AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD from the app's .env (never printed).
 *
 * Per id: open through the store → wait `settle` ms → classify:
 *   rendered      the instance is open and no error card / no console error appeared
 *   error-card    the package's overlay error card (role="alert" inside an overlay) is on screen
 *   console-error rendered, but console.error / pageerror fired while it was open
 *   not-open      the open did not land in the store (refused or closed itself)
 * then close it and move on. Exit code 1 when any id is not "rendered".
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type ConsoleMessage, type Page } from "playwright";

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const BASE = arg("--url");
if (!BASE) {
  console.error("usage: sweep.ts --url <dev server origin> [--route /path] [--only a,b] [--out file] [--settle ms] [--headed]");
  process.exit(2);
}
const ROUTE = arg("--route") ?? "/notes";
const ONLY = arg("--only")?.split(",").filter(Boolean);
const OUT = arg("--out") ?? path.resolve("tmp/overlays-sweep.json");
const SETTLE = Number(arg("--settle") ?? 2500);
/**
 * --data: a JSON object { "<overlay id>": { ...open data } } for overlays that refuse to render
 * without a record (share, review, access, conversation-bound windows). Ids not in it open with {}.
 */
const DATA_FILE = arg("--data");
const OPEN_DATA: Record<string, Record<string, unknown>> = DATA_FILE ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) : {};

function readEnv(): Record<string, string> {
  const appRoot = path.resolve(path.dirname(path.resolve(process.argv[1] ?? ".")), "../..");
  const out: Record<string, string> = {};
  for (const f of [".env.local", ".env"]) {
    const p = path.join(appRoot, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1]! in out)) out[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

interface Row {
  id: string;
  status: "rendered" | "error-card" | "console-error" | "not-open";
  withData?: boolean;
  consoleErrors: string[];
  errorCard?: string;
  ms: number;
}

async function signIn(page: Page): Promise<void> {
  const env = { ...readEnv(), ...process.env };
  const user = env.AI_ADMIN_USERNAME;
  const pass = env.AI_ADMIN_PASSWORD;
  if (!user || !pass) throw new Error("AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD missing from the app's .env");
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"]').first().fill(user);
  await page.locator('input[type="password"], input[name="password"]').first().fill(pass);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: !argv.includes("--headed") });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  await signIn(page);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: "domcontentloaded" });
  // The hook arrives with the deferred singleton core (post-idle); wait for it.
  await page.waitForFunction(() => { const h = (window as unknown as { __overlaysTest?: SummonTestHook }).__overlaysTest; return !!h && h.ids().length > 0; }, null, { timeout: 120_000 });
  const ids: string[] = ONLY ?? (await page.evaluate(() => (window as unknown as { __overlaysTest: SummonTestHook }).__overlaysTest.ids()));
  console.log(`sweeping ${ids.length} overlays on ${ROUTE}`);

  let current: string[] = [];
  const onConsole = (m: ConsoleMessage) => {
    if (m.type() === "error") current.push(m.text().slice(0, 500));
  };
  page.on("console", onConsole);
  page.on("pageerror", (e) => current.push(`pageerror: ${String(e).slice(0, 500)}`));

  const rows: Row[] = [];
  for (const id of ids) {
    current = [];
    const t0 = Date.now();
    const instanceId = await page.evaluate(([x, d]) => (window as unknown as { __overlaysTest: SummonTestHook }).__overlaysTest.open(x, d), [id, OPEN_DATA[id] ?? {}] as const);
    await page.waitForTimeout(SETTLE);
    const open = await page.evaluate(([x, inst]) => (window as unknown as { __overlaysTest: SummonTestHook }).__overlaysTest.isOpen(x, inst), [id, instanceId] as const);
    const errorCard = await page
      .locator('[role="alert"]')
      .filter({ hasText: /Try again|could not load|went wrong/i })
      .first()
      .textContent({ timeout: 200 })
      .catch(() => null);
    const status: Row["status"] = errorCard ? "error-card" : open === false ? "not-open" : current.length ? "console-error" : "rendered";
    rows.push({ id, status, ...(OPEN_DATA[id] ? { withData: true } : {}), consoleErrors: current, ...(errorCard ? { errorCard: errorCard.slice(0, 300) } : {}), ms: Date.now() - t0 });
    console.log(`${status.padEnd(13)} ${id}${current.length ? `  (${current.length} console errors)` : ""}`);
    await page.evaluate((x) => (window as unknown as { __overlaysTest: SummonTestHook }).__overlaysTest.close(x), id);
    await page.waitForTimeout(200);
  }
  await browser.close();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ base: BASE, route: ROUTE, at: new Date().toISOString(), rows }, null, 2));
  const bad = rows.filter((r) => r.status !== "rendered");
  console.log(`\n${rows.length - bad.length}/${rows.length} rendered clean; report: ${OUT}`);
  if (bad.length) process.exitCode = 1;
}

/** The dev hook installed by OverlayServices (typed here; the page owns the real one). */
interface SummonTestHook {
  ids(): string[];
  open(id: string, data?: Record<string, unknown>): string;
  close(id: string): void;
  isOpen(id: string, instanceId: string): boolean;
}
// No helper function for the hook: page.evaluate serializes only the callback's own source, so a
// Node-side helper called inside it is undefined in the browser.

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
