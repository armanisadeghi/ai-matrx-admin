/**
 * THE OVERLAY SWEEP — opens EVERY registered overlay in a running build and records, per id,
 * whether it is ON SCREEN (scripts/overlays/sweep-probe.ts: a summon window ack, a node inside the
 * app's `[data-overlay-id]` wrapper, or a new dialog surface — each with a visible box), still
 * loading, blank, hit its error card, or logged console errors.
 *
 *   # gate run against a production build (the hook is compiled in only with the flag):
 *   NEXT_PUBLIC_OVERLAYS_SWEEP=1 pnpm build:next && pnpm exec next start -p 3361
 *   npx tsx scripts/overlays/sweep.ts --url http://localhost:3361 --min 213 \
 *       [--route /notes] [--only id1,id2] [--out sweep.json] [--settle 2500] [--data data.json]
 *   # self-test (no server: real Chromium over planted overlays, one renders null):
 *   npx tsx scripts/overlays/sweep.ts --self-test
 *
 * Signs in as the test admin with AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD from the app's .env (never
 * printed). `window.__overlaysTest` is installed by features/overlays/host/OverlayServices.tsx in
 * dev, or in a build made with NEXT_PUBLIC_OVERLAYS_SWEEP=1.
 *
 * Exit 1 when fewer than --min ids (default: all) are "rendered".
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type ConsoleMessage, type Page } from "playwright";
import { PROBE_SOURCE, SNAPSHOT_SOURCE, classifyOverlay, type ProbeResult, type SweepStatus } from "./sweep-probe";

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

interface Row {
  id: string;
  status: SweepStatus;
  proof: ProbeResult["proof"];
  detail: string | null;
  withData?: boolean;
  consoleErrors: string[];
  /** Every response >= 400 while the id was open: the evidence behind a console error ("Failed to load resource" names no URL). */
  failedRequests?: string[];
  errorCard?: string;
  ms: number;
}

/** The hook the page provides (OverlayServices); typed here. */
interface SummonTestHook {
  ids(): string[];
  open(id: string, data?: Record<string, unknown>): string;
  close(id: string): void;
  isOpen(id: string, instanceId: string): boolean;
}
type HookWindow = { __overlaysTest: SummonTestHook };

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

async function signIn(page: Page, base: string): Promise<void> {
  const env = { ...readEnv(), ...process.env };
  const user = env.AI_ADMIN_USERNAME;
  const pass = env.AI_ADMIN_PASSWORD;
  if (!user || !pass) throw new Error("AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD missing from the app's .env");
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('button[type="submit"]:not([disabled]):not([data-preparing="true"])').first().waitFor({ timeout: 300_000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill(user);
  await page.locator('input[type="password"], input[name="password"]').first().fill(pass);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 300_000 });
}

/**
 * The debug indicators (promptDebugIndicator, resourceDebugIndicator, executionStateDebug) exist only
 * while admin debug mode is on (components/debug/DebugModeGate closes them otherwise). Turn it ON
 * deterministically: open the admin chip, read its toggle's aria-pressed, click only when it is off.
 */
async function ensureDebugMode(page: Page): Promise<boolean> {
  await page.evaluate(() => (window as unknown as HookWindow).__overlaysTest.open("adminIndicator", {}));
  const toggle = page.locator('button[title="Toggle Debug Mode"]').first();
  try {
    await toggle.waitFor({ timeout: 30_000 });
    if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
    await page.waitForFunction(() => document.querySelector('button[title="Toggle Debug Mode"]')?.getAttribute("aria-pressed") === "true", null, { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/** Open each id, wait, look for on-screen proof, classify, close. Shared by the gate and the self-test. */
async function sweepIds(page: Page, ids: readonly string[], opts: { settle: number; data: Record<string, Record<string, unknown>> }): Promise<Row[]> {
  let current: string[] = [];
  let failed: string[] = [];
  const onResponse = (r: { status(): number; url(): string; request(): { method(): string } }) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 300)}`);
  };
  page.on("response", onResponse);
  const onConsole = (m: ConsoleMessage) => {
    if (m.type() === "error") current.push(m.text().slice(0, 500));
  };
  page.on("console", onConsole);
  page.on("pageerror", (e) => current.push(`pageerror: ${String(e).slice(0, 500)}`));
  const rows: Row[] = [];
  for (const id of ids) {
    current = [];
    failed = [];
    const t0 = Date.now();
    const before = (await page.evaluate(`(${SNAPSHOT_SOURCE})()`)) as string;
    const instanceId = await page.evaluate(([x, d]) => (window as unknown as HookWindow).__overlaysTest.open(x, d), [id, opts.data[id] ?? {}] as const);
    // Poll for proof up to `settle`; a slow chunk gets the whole window, a fast one ends early.
    let probe: ProbeResult = { proof: null, loading: false, detail: null };
    const deadline = Date.now() + opts.settle;
    do {
      await page.waitForTimeout(250);
      probe = (await page.evaluate(`(${PROBE_SOURCE})(${JSON.stringify({ overlayId: id, before })})`)) as ProbeResult;
    } while (!probe.proof && Date.now() < deadline);
    if (probe.proof) await page.waitForTimeout(300); // let a render error or console error surface
    const open = await page.evaluate(([x, inst]) => (window as unknown as HookWindow).__overlaysTest.isOpen(x, inst), [id, instanceId] as const);
    const errorCard = await page
      .locator('[role="alert"]')
      .filter({ hasText: /Try again|could not load|went wrong/i })
      .first()
      .textContent({ timeout: 200 })
      .catch(() => null);
    const status = classifyOverlay({ open, errorCard, consoleErrors: current, probe });
    rows.push({ id, status, proof: probe.proof, detail: probe.detail, ...(opts.data[id] ? { withData: true } : {}), consoleErrors: current, ...(failed.length ? { failedRequests: failed } : {}), ...(errorCard ? { errorCard: errorCard.slice(0, 300) } : {}), ms: Date.now() - t0 });
    console.log(`${status.padEnd(13)} ${id}${probe.detail ? `  ${probe.detail}` : ""}${current.length ? `  (${current.length} console errors)` : ""}`);
    await page.evaluate((x) => (window as unknown as HookWindow).__overlaysTest.close(x), id);
    await page.waitForTimeout(200);
  }
  page.off("console", onConsole);
  page.off("response", onResponse);
  return rows;
}

/**
 * Self-test: a static page with a fake hook and four planted overlays — a visible card, one whose
 * render returns null, one stuck on the loading fallback, one that renders off-screen. The real
 * sweep loop must call ONLY the card "rendered".
 */
async function selfTest(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  await page.setContent(`<!doctype html><html><body><div id="host"></div><script>
    var host = document.getElementById("host"), open = {};
    var render = {
      card: '<div data-overlay-id="card" style="display:contents"><section style="position:fixed;left:40px;top:40px;width:300px;height:200px;background:#eee">Card</section></div>',
      nullRender: '<div data-overlay-id="nullRender" style="display:contents"></div>',
      stuckLoading: '<div data-overlay-id="stuckLoading" style="display:contents"><div class="fixed inset-0" style="position:fixed;inset:0"><div role="status" style="width:200px;height:40px"><span class="animate-spin"></span>Loading</div></div></div>',
      offScreen: '<div data-overlay-id="offScreen" style="display:contents"><section style="position:fixed;left:-5000px;top:40px;width:300px;height:200px">Gone</section></div>'
    };
    window.__overlaysTest = {
      ids: function () { return Object.keys(render); },
      open: function (id) { open[id] = true; host.innerHTML = render[id]; return "default"; },
      close: function (id) { open[id] = false; host.innerHTML = ""; },
      isOpen: function (id) { return !!open[id]; }
    };
  </script></body></html>`);
  const ids = ["card", "nullRender", "stuckLoading", "offScreen"];
  const rows = await sweepIds(page, ids, { settle: 800, data: {} });
  await browser.close();
  const expected: Record<string, SweepStatus> = { card: "rendered", nullRender: "blank", stuckLoading: "loading", offScreen: "blank" };
  let ok = true;
  for (const r of rows) {
    const pass = r.status === expected[r.id];
    ok &&= pass;
    console.log(`self-test ${expected[r.id] === "rendered" ? "GREEN" : "RED"} (${r.id} -> ${r.status}, want ${expected[r.id]}): ${pass ? (expected[r.id] === "rendered" ? "ok" : "caught") : "WRONG"}`);
  }
  process.exit(ok ? 0 : 1);
}

async function main(): Promise<void> {
  if (argv.includes("--self-test")) return selfTest();
  const base = arg("--url");
  if (!base) {
    console.error("usage: sweep.ts --url <origin> [--min n] [--route /path] [--only a,b] [--out file] [--settle ms] [--data file] [--no-debug-mode] [--headed] | --self-test");
    process.exit(2);
  }
  const route = arg("--route") ?? "/notes";
  const only = arg("--only")?.split(",").filter(Boolean);
  const out = arg("--out") ?? path.resolve("tmp/overlays-sweep.json");
  const settle = Number(arg("--settle") ?? 2500);
  /** --data: { "<overlay id>": { ...open data } } for overlays that refuse to render without a record. */
  const dataFile = arg("--data");
  const data: Record<string, Record<string, unknown>> = dataFile ? JSON.parse(fs.readFileSync(dataFile, "utf8")) : {};

  const browser = await chromium.launch({ headless: !argv.includes("--headed") });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  // a dev server's first compile of /login or the route can take minutes under load
  page.setDefaultNavigationTimeout(300_000);
  await signIn(page, base);
  await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
  // The hook arrives with the deferred singleton core (post-idle); wait for it.
  await page.waitForFunction(() => { const h = (window as unknown as Partial<HookWindow>).__overlaysTest; return !!h && h.ids().length > 0; }, null, { timeout: 120_000 });
  const ids: string[] = only ?? (await page.evaluate(() => (window as unknown as HookWindow).__overlaysTest.ids()));
  if (!argv.includes("--no-debug-mode")) console.log(`admin debug mode on: ${await ensureDebugMode(page)}`);
  console.log(`sweeping ${ids.length} overlays on ${route}`);
  const rows = await sweepIds(page, ids, { settle, data });
  await browser.close();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ base, route, at: new Date().toISOString(), rows }, null, 2));
  const clean = rows.filter((r) => r.status === "rendered").length;
  const min = Number(arg("--min") ?? rows.length);
  const counts = rows.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
  console.log(`\n${clean}/${rows.length} rendered on screen (need ${min}); ${JSON.stringify(counts)}; report: ${out}`);
  if (clean < min) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
