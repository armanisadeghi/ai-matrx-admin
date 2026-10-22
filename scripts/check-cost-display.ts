#!/usr/bin/env npx tsx
/**
 * check:cost-display — a UI file that shows a person a COST in dollars.
 *
 * THE RULE (Arman, 2026-09-27): "No one talks cost to a normal user, only api
 * users. For normal users, they use points or credits … Everyone should see
 * credits/points except for system admins who should always be able to toggle
 * to see $." Every AI/run cost therefore renders through ONE primitive:
 * `<Cost usd={…}/>` / `<CostBadge/>` / `useCostDisplay().format` in
 * `components/cost/`, built on `formatCost` in `@ai-matrx/kit/format`
 * at the rate of the `billing.points_per_usd` knob — the same rate
 * `aidream/services/billing/ai_points.py` banks. A member sees points; only a system admin who flipped the switch in
 * the header menu's Admin group sees dollars.
 *
 * WHAT THIS FLAGS, per file (comments excluded):
 *   R1 `formatUsd(`                       — the kit's raw dollar formatter;
 *   R2 `currency: "USD"`                  — an Intl dollar formatter;
 *   R3 `<cost/usd/spend/savings name>.toFixed(` or `(… ?? 0).toFixed(`
 *                                          — a hand-rolled dollar figure;
 *   R4 `"$" + …`                          — a hand-glued dollar sign.
 *
 * AND THE OTHER HALF OF THE RULING — a cost that IGNORES THE ADMIN SWITCH
 * (always points, even for an admin who asked for dollars). No baseline; any
 * hit fails:
 *   R5 `unit: CostUnit = "points"` / `unit = "points"` — a helper whose
 *      default silently drops the switch; default to `currentCostUnit()`
 *      (`components/cost/costUnit.ts`) or take the unit from the hook;
 *   R6 `formatCost(…)` imported from `@ai-matrx/kit/format` and called with
 *      no `unit` — kit's default is points, so the switch never reaches it.
 *
 * AND THE RATE (Arman, 2026-09-30: the points-per-dollar rate is ONE setting,
 * the `billing.points_per_usd` knob). Kit's `formatCost` / `usdToPoints` /
 * `pointsToUsd` take `{ rate }` from the caller; the host reads it through
 * `currentPointsRate()` / `useCostDisplay().rate` (`components/cost/pointsRate.ts`):
 *   R7 a kit points call whose `rate` is a number literal — a second copy of
 *      the setting that an organization's rate (or the platform's) never reaches.
 *
 * AND WHERE (owner ruling 2026-10-22, common-docs/policies/points-and-money-in-the-ui.md):
 *   P1 points printed only where cost is the surface's PURPOSE (billing, usage,
 *      budgets, battles), on the admin site, in an out-of-points block, or in a
 *      panel opened by clicking a usage control; everywhere else the price sits
 *      inside a `<CostDoor>` (or an `<AdminOnly>` block), which P1 skips. A file shows a price when it uses a `components/cost`
 *      render export, a kit points call, a PRICE_HELPERS name or a DERIVED
 *      helper (an exported price/cost/points/estimate-named function whose own
 *      body shows a price, followed through imports to a fixpoint), or literal
 *      price text ("3 pts", "N points used", a bare "Free", "not charged",
 *      "costs nothing"). Such a file must sit in ALLOWED_PLACES, whose every
 *      reason names its deciding/investigating case; NOT_A_PRICE holds literal
 *      look-alikes (a "Free" crop ratio). Scans this repo AND the sibling
 *      aidream/apps/shared packages (a loud note when that checkout is absent).
 *      Existing violations ride the same ratchet baseline (`placement`).
 *
 * NOT FLAGGED: `components/cost/**` (the primitive), tests, scripts, and the
 * DOMAIN_MONEY files below — real money that is not what the platform charged
 * for AI work (a worker's pay, a course price, a keyword's CPC, a print order's
 * price). Each carries its reason; a file whose rule no longer fires there
 * fails as STALE so the list cannot rot.
 *
 * THE BASELINE IS A RATCHET (`scripts/cost-display-baseline.json`): per-file
 * counts of cost sites not yet converted. New file or higher count = exit 1;
 * `--write` ratchets it down (never up).
 *
 *   pnpm check:cost-display
 *   pnpm check:cost-display --write       # ratchet down / seed
 *   pnpm check:cost-display --self-test   # every rule fires on a planted line
 *   pnpm check:cost-display --sites <file…>  # print a file's P1 (price) lines
 *   pnpm check:cost-display --counts      # every file's current counts, as JSON
 *   pnpm check:cost-display --census      # every file that shows a price + the entry it rides
 *
 * P2 (same ruling): a bare dollar helper (formatAdminUsd, formatSpendUsd, formatAdminCost, …, or
 * formatViewerCost told unit "usd") off the admin site (ADMIN_SITE), outside a door element.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { exitAfterDrain } from "./lib/exit-after-drain";
// The fleet's money SHAPE detector (template `$${x}`, `"$" + x`, Intl currency
// formatters and every `.format()` on them, labeled `.toFixed`, cents
// division) — reused so a helper named `fmt(n)` cannot hide a dollar sign.
import { moneyShapeIn } from "./money-shape.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_FILE = join(ROOT, "scripts", "cost-display-baseline.json");

/** Real money that is not platform cost — dollars are the truth here. */
export const DOMAIN_MONEY: Record<string, string> = {
  "features/hr/time/shared/format.ts": "a worker's pay",
  "features/hr/people/profile/tabs/CompensationTab.tsx": "a worker's compensation",
  "features/hr/people/profile/ProposePayChange.tsx": "a proposed pay change",
  "features/legal/wc/pd-ratings/lib/formulas.ts": "a workers'-comp award amount",
  "features/education/creators/components/EnrollButton.tsx": "a course's price to a student",
  "features/marketing/link-valuation/configs/matrx-v1.ts": "a backlink's market value",
  "features/marketing/link-valuation/configs/sheet-2018.ts": "a backlink's market value",
  "features/marketing/seo/keyword-research/format.ts": "a keyword's cost-per-click in the ad market",
  "features/product-capture/components/pipeline/ResearchPanel.tsx": "a product's sale price",
  "features/education/creators/components/CreatorLandingPage.tsx": "a course's price to a student",
  "features/education/creators/components/CreatorDashboard.tsx": "a creator's earnings",
  "features/education/classes/components/ClassFormDialog.tsx": "a class's tuition",
  "features/print/order/lulu-api.ts": "a print order's price",
  "features/marketing/seo/value-system/offerings/vocabulary.ts": "a business offering's own published list price",
  "features/templates/files/seeds/workbook-templates.ts": "sample figures in featured spreadsheet templates (a budget, an invoice), formatted by the cell's own number format",
  "features/print/order/OrderFlow.tsx": "a print order's price",
  "components/mardown-display/blocks/print-kinds/print-kind-blocks.tsx": "a print quote's price",
  "components/mardown-display/blocks/commerce-kinds/commerce-kind-blocks.tsx": "a product's price",
  "features/crm/deals/types.ts": "a sales deal's value",
  "features/hr/me/MyPaySurface.tsx": "a worker's pay",
  "features/legal/wc/pd-ratings/components/workspace/RatingBreakdownTable.tsx": "a workers'-comp award amount",
  "features/marketing/seo/domain-research/DomainResearchPage.tsx": "a keyword's cost-per-click in the ad market (the CPC column)",
  "features/marketing/ads/GoogleAdsWorkspace.tsx": "the customer's own Google Ads spend",
  "features/marketing/initiatives/columns.tsx": "a marketing initiative's budget",
  "features/marketing/initiatives/InitiativeDetail.tsx": "a marketing initiative's budget",
  "features/marketing/link-valuation/components/ResultPanel.tsx": "a backlink's market value",
  "features/marketing/link-valuation/engine.ts": "a backlink's market value",
  "features/marketing/seo/keyword-research/components/KeywordMetrics.tsx": "a keyword's cost-per-click in the ad market",
  "features/pricing/education/EducationPricing.tsx": "our subscription plan prices",
  "features/entitlements/catalog/format.ts": "our subscription plan prices (formatCents, every billing.plan price)",
  "features/admin/limits/types.ts": "our subscription plan prices on the admin limits matrix",
  "app/(public)/templates/[slug]/social-image/route.tsx": "a currency-typed field value from a template's sample record, drawn into its share image",
  "features/make/gallery/TemplateShowcase.tsx": "a currency-typed field value in a template's sample rows",
  "features/scopes/components/reference/ContextValueDisplay.tsx": "a person's own currency-typed value",
  "features/ai-models/components/ModelPricingEditor.tsx": "the provider's USD price list an admin edits",
  "features/ai-models/components/ProviderPriceCell.tsx": "the provider's USD price list an admin syncs",
  "features/ai-models/utils/providerSyncPricing.ts": "the provider's USD price list an admin syncs",
  "features/admin/dated-changes/describe.ts": "the provider's per-million-token USD price schedule, shown only in the admin attention queue",
  "../aidream/apps/shared/chat/src/action-requests/components/spendAmount.ts": "the approve-spend amount box's dollar text, reached ONLY when the viewer's unit is usd (a system admin's switch); members type points",
  "features/tool-call-visualization/admin/ToolTestSamplesViewer.tsx": "the provider's per-million-token USD price list, shown to an admin debugging a tool-test sample's cost estimate",
  "app/(core)/organizations/[orgId]/settings/payments/PaymentsSettings.tsx": "an amount the organization asks a customer to pay through its own payment account",
  "features/content-ir/studio/playground/demos/reader-locale.ts": "a playground demo's sample amount in the reader's locale (a kind's own currency field)",
  "features/payments/server.ts": "an amount the organization asks a customer to pay through its own payment account",
  "features/marketing/seo/domain-research/summaries.ts": "a domain's estimated organic value and ad budget in the ad market, in real dollars",
  "features/admin/attention/sources/tool-health.ts": "the vendor's published price book entry, shown only in the admin attention queue",
  "features/tool-battle/derive.ts": "a tool's measured cost per success in the admin-only tool battle",
};

const SKIP_PREFIXES = ["components/cost/", "scripts/", "node_modules/", ".next/"];

const RULES: { id: string; re: RegExp }[] = [
  { id: "R1 formatUsd(", re: /\bformatUsd\s*\(/g },
  { id: "R2 Intl USD", re: /currency:\s*["'`]USD["'`]/g },
  {
    id: "R3 cost.toFixed",
    re: /\b[\w.?]*(?:[cC]ost|[uU]sd|USD|[sS]pend|[sS]avings)[\w?]*\s*\)?\s*\.toFixed\s*\(/g,
  },
  {
    id: "R3 (cost ?? 0).toFixed",
    re: /\(\s*[\w.?]*(?:[cC]ost|[uU]sd|USD|[sS]pend|[sS]avings)[\w.?]*\s*(?:\?\?\s*0\s*)?\)\s*\.toFixed\s*\(/g,
  },
  { id: "R4 \"$\" +", re: /["'`]\$["'`]\s*\+/g },
];

/** How many LINES of one file's source show money: THE shape detector's
 *  findings plus this guard's cost rules, each line counted once. Pure. */
export function countCostSites(source: string): number {
  const lines = new Set<number>();
  for (const hit of moneyShapeIn(source) as { line: number }[]) lines.add(hit.line);
  source.split("\n").forEach((line, i) => {
    if (/^\s*(\*|\/\*|\/\/)/.test(line)) return;
    const code = line.replace(/(^|[^:"'`\\])\/\/.*$/, "$1").replace(/\/\*.*?\*\//g, " ");
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      if (rule.re.test(code)) {
        lines.add(i + 1);
        break;
      }
    }
  });
  return lines.size;
}

function isUiFile(file: string): boolean {
  if (!/\.(ts|tsx)$/.test(file) || file.endsWith(".d.ts")) return false;
  if (/(^|\/)__(tests|fixtures)__\//.test(file) || /\.(test|spec)\.tsx?$/.test(file)) return false;
  if (SKIP_PREFIXES.some((p) => file.startsWith(p))) return false;
  return /^(app|features|components|lib|hooks|providers|utils)\//.test(file);
}

const KIT_POINTS_CALLS = ["formatCost", "usdToPoints", "pointsToUsd"] as const;

/** R7 — lines where a kit points call hard-codes its rate. Pure. */
export function literalRateSites(source: string): number[] {
  const hits = new Set<number>();
  const kitImport = source.match(/import\s*\{([^}]*)\}\s*from\s*["']@ai-matrx\/kit\/format["']/);
  if (!kitImport) return [];
  const locals: string[] = [];
  for (const spec of kitImport[1].split(",")) {
    const m = spec.trim().match(/^(\w+)(?:\s+as\s+(\w+))?$/);
    if (m && (KIT_POINTS_CALLS as readonly string[]).includes(m[1])) locals.push(m[2] ?? m[1]);
  }
  for (const name of locals) {
    const re = new RegExp(`(?<![\\w.])${name}\\s*\\(`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      let depth = 0;
      let j = m.index + m[0].length - 1;
      for (; j < source.length; j++) {
        const ch = source[j];
        if (ch === "(") depth++;
        else if (ch === ")" && --depth === 0) break;
      }
      const args = source.slice(m.index + m[0].length, j);
      if (/\brate\s*:\s*[-+]?[\d.]/.test(args)) hits.add(source.slice(0, m.index).split("\n").length);
    }
  }
  return [...hits].sort((a, b) => a - b);
}

/** R5/R6 — lines where a cost ignores the admin's dollars switch. Pure. */
export function switchIgnoredSites(source: string): number[] {
  const hits = new Set<number>();
  const lines = source.split("\n");
  const importsKitFormatCost =
    /import\s*(?:type\s*)?\{[^}]*\bformatCost\b[^}]*\}\s*from\s*["']@ai-matrx\/kit\/format["']/.test(source);
  lines.forEach((line, i) => {
    if (/^\s*(\*|\/\*|\/\/)/.test(line)) return;
    if (/\bCostUnit\s*=\s*["']points["']|\bunit\s*=\s*["']points["']/.test(line)) hits.add(i + 1);
  });
  if (importsKitFormatCost) {
    const re = /\bformatCost\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      const before = source.slice(Math.max(0, m.index - 16), m.index);
      if (/function\s+$/.test(before) || /\.\s*$/.test(before)) continue;
      let depth = 0;
      let j = m.index + m[0].length - 1;
      for (; j < source.length; j++) {
        const ch = source[j];
        if (ch === "(") depth++;
        else if (ch === ")" && --depth === 0) break;
      }
      const args = source.slice(m.index + m[0].length, j);
      if (!/\bunit\b/.test(args)) hits.add(source.slice(0, m.index).split("\n").length);
    }
  }
  return [...hits].sort((a, b) => a - b);
}

// ─── P1 PLACEMENT (Arman, 2026-10-18 — law 14) ──────────────────────────────
// R1–R7 make a cost CORRECT (points, the switch, the knob's rate). P1 decides
// WHERE one may appear at all: only where the person is deciding or
// investigating, never where they are doing their work.

/** The policy every placement failure points to. */
export const PLACEMENT_POLICY = "common-docs/policies/points-and-money-in-the-ui.md";

/** The only reasons a file may show a price. Every ALLOWED_PLACES reason starts
 *  with one of these, followed by ": " and what the person is deciding or
 *  looking up there. */
export const PLACEMENT_CASES = [
  // Owner ruling 2026-10-22: points only where the surface's PURPOSE is cost, or after the person
  // clicked to ask. Pickers, info cards, history tables, confirm footers and schedule setup are no
  // longer cases of their own: their price moves behind a <CostDoor>.
  "billing/usage/pricing/budget",
  "battle",
  "admin-gated",
  "out of points",
  "usage door",
] as const;

/**
 * THE ALLOWED PLACES — every file (or glob: `dir/**`, or `*` inside one path
 * segment) that may render a price. A UI file outside this list that renders
 * one fails P1. Adding an entry needs a deciding/investigating reason from
 * PLACEMENT_CASES — "it already showed a cost" is not one. Doing surfaces
 * (chat, result blocks, generated media, tool results, receipts, toasts,
 * notifications, a live run's header, one-click buttons, action menus) never
 * belong here.
 */
export const ALLOWED_PLACES: Record<string, string> = {
  // Owner ruling 2026-10-22: points only where the surface's purpose is cost, or after a click to ask.
  // Everything else puts its price in a <CostDoor> (and needs no entry here).
  // admin-gated — cost views only an admin or a builder's dev panel reaches
  "app/(admin)/**": "admin-gated: the admin route group",
  "app/(dev)/**": "admin-gated: the dev route group",
  "features/admin/**": "admin-gated: admin feature screens",
  "features/administration/**": "admin-gated: the administration console",
  "features/cx-dashboard/**": "admin-gated: the conversation admin dashboard",
  "features/mandates/admin*/**": "admin-gated: mandate admin screens",
  "features/mandates/run-history/format.ts": "admin-gated: costWords is read only by the mandate admin Try-it panel",
  "features/builder-panel/**": "admin-gated: the builder's dev panel (its dollar cells sit in <AdminOnly>)",
  "features/proof-runs/**": "admin-gated: proof-run operator screens",
  "features/ai-test-mode/admin/**": "admin-gated: test-mode admin",
  "features/ai-watch/**": "admin-gated: the AI watch dev panel",
  "features/tool-battle/**": "admin-gated: the tool battle (an admin comparison of tools)",
  "features/scheduling/components/admin/**": "admin-gated: the scheduler's system-jobs admin",
  "features/ai-models/components/AiModelDetailPanel.tsx": "admin-gated: opened only from the admin AI models pages",
  "features/hindsight/components/HindsightPage.tsx": "admin-gated: reached only from the admin hindsight page",
  "features/hindsight/components/EnrollmentDetailPanel.tsx": "admin-gated: a panel of the admin hindsight page",
  "features/hindsight/components/FindingEffectivenessPanel.tsx": "admin-gated: a panel of the admin hindsight page",
  "features/data-sources/library/UnderTheHood.tsx":
    "admin-gated: the under-the-hood block renders only for an admin in admin debug view, under its Admin only tag",
  // battle
  "features/agents/studio/components/StudioBattle.tsx": "battle: what a battle round costs before it runs",
  "features/agents/studio/components/StudioCases.tsx": "battle: what running the battle cases costs before they run",
  "features/agent-comparison/**": "battle: agent battles and comparisons, price per arm is part of the verdict",
  "features/workflow-comparison/**": "battle: workflow battles, price per arm is part of the verdict",
  "features/workflow-runtime/bakeoff/**": "battle: workflow bake-offs, price per entrant is part of the verdict",
  "features/masterwork/encore/**": "battle: the encore bench and auditions compare entrants, price per entrant is part of the verdict",
  "features/mandates/candidates/**": "battle: a mandate's live vs candidate comparison",
  "features/mandates/record-next/MandateCandidatesPanel.tsx": "battle: a mandate's live vs candidate comparison",
  "features/data-sources/lab/DataToModelLab.tsx":
    "battle: the lab compares handing data over against the model fetching it, price is part of the verdict",
  "features/data-sources/unlock/UnlockPage.tsx":
    "battle: the unlock page compares unlockers side by side with a verdict, cost per arm is part of it",
  "features/data-sources/library/hooks.ts":
    "battle: usePriceText (points only) is read only by the lab and unlock battles; every other surface uses sourceCostRow in a CostDoor",
  "features/data-sources/library/catalog.ts":
    "battle: pointsFor/pointsPerRecord feed the lab and unlock battles and the CostDoor rows",
  // usage door — a panel the person opens only by clicking a usage/stats control, or a helper read only inside a CostDoor
  "../aidream/apps/shared/chat/src/agents/components/run-controls/panels/**":
    "usage door: opened only by clicking the Request or Session stats tab in the Creator run panel",
  "../aidream/apps/shared/records-ui/src/pointsCost.ts": "usage door: costInPoints read only inside a CostDoor",
  "../aidream/apps/shared/records-ui/src/Enrich.tsx":
    "usage door: every printed figure sits in host.CostDoor; the remaining lines compute the estimate the door shows",
  "features/scheduling/components/triggers/TriggersManager.tsx":
    "usage door: its cost columns start hidden; showing one from the column picker is asking for usage, stats sit in a CostDoor",
  "features/marketing/social/cost.ts":
    "usage door: reads points to gate confirms and feed CostDoor rows; agentCostText still feeds the package's agent approve-spend card",
  "features/marketing/seo/ai-visibility/brand/RunCheckButton.tsx":
    "usage door: toPoints only gates the confirm; the price prints in a CostDoor",
  // billing/usage/pricing/budget — surfaces whose purpose is cost
  "features/organizations/admin/**":
    "billing/usage/pricing/budget: an organization's member spend and budgets screens, in points only (org admins are users: no dollars)",
  "app/(core)/organizations/[orgId]/admin/automations/**":
    "billing/usage/pricing/budget: the organization's automation cost page",
  "features/scheduling/components/costs/**": "billing/usage/pricing/budget: the automation cost page",
  "features/applets/format.ts": "billing/usage/pricing/budget: an app's usage KPIs on its analytics",
  "features/applets/route/AppletSettingsContent.tsx": "billing/usage/pricing/budget: an app's usage on its settings",
  "lib/entity-list/usageColumns.tsx": "billing/usage/pricing/budget: the usage columns of an entity list",
  "features/scheduling/components/limits/AutomationLimitsSection.tsx": "billing/usage/pricing/budget: automation limits",
  "features/entitlements/**": "billing/usage/pricing/budget: plans, usage, wallet, usage history",
  "features/settings/tabs/PlanUsageTab.tsx": "billing/usage/pricing/budget: the plan and usage settings tab",
  "app/api/education/coppa-verification/**": "billing/usage/pricing/budget: a guardian's real card authorization, voided",
  "features/education/family/components/GuardianConsentVerifyDialog.tsx":
    "billing/usage/pricing/budget: a guardian's real card authorization, voided",
  "features/pricing/**": "billing/usage/pricing/budget: plan prices and upgrade",
  "features/batch-savings/**": "billing/usage/pricing/budget: what batching billed and saved",
  "features/organizations/components/OrgPrivacyTab.tsx": "billing/usage/pricing/budget: the organization's daily budget",
  "features/marketing/components/operations/SeoSpendPanel.tsx": "billing/usage/pricing/budget: the SEO spend dashboard",
  "features/marketing/components/operations/SeoSpendChart.tsx": "billing/usage/pricing/budget: the SEO spend dashboard",
  "features/marketing/data/operations-format.ts":
    "billing/usage/pricing/budget: formatRuntimeCost is read only by the SEO spend dashboard",
  "features/marketing/social/components/SocialProviderCard.tsx":
    "billing/usage/pricing/budget: Operations > Connections shows the social provider's monthly spend",
  "features/marketing/news-monitor/NewsMonitorRunView.tsx":
    "out of points: mounts the CostBanner ceiling-reached block on the monitor's run view",
  "features/marketing/news-monitor/CostBanner.tsx":
    "out of points: the monthly news ceiling reached / near-limit block with Resume",
  "features/research/components/costs/**": "billing/usage/pricing/budget: the research cost dashboard",
  "components/official/drill-explorer/**": "billing/usage/pricing/budget: the usage explorer",
};

/** P2 — the components/cost helpers that hand back a BARE dollar string (no "Admin only" tag can ride a
 *  string). Off the admin site they must sit inside a door element, or not be called at all: a system
 *  admin reads dollars there only inside a labelled element (owner ruling 2026-10-22). */
export const DOLLAR_TEXT_NAMES = new Set([
  "formatSpendUsd",
  "formatAdminUsd",
  "formatAdminCost",
  "formatAdminUsdAxisTick",
]);
/** `formatViewerCost` prints dollars only when told `unit: "usd"`; a unit taken from
 *  `useCostDisplay().unit` / `currentCostUnit()` is already points off the admin site. */
const VIEWER_COST = "formatViewerCost";
/** The admin site: manage.aimatrx.com and the dev site, where the whole site is the admin label. */
export const ADMIN_SITE = [
  "app/(admin)/**",
  "app/(dev)/**",
  "features/admin/**",
  "features/administration/**",
  // reached only from app/(admin) routes (route evidence: cost-display sweep, 2026-10-22)
  "features/cx-dashboard/**",
  "features/tool-battle/**",
  "features/ai-test-mode/admin/**",
  "features/mandates/admin-list/**",
  "features/mandates/admin/**",
  "features/mandates/run-history/format.ts",
  "features/hindsight/components/FindingEffectivenessPanel.tsx",
];

/** P2 — lines using a bare-dollar helper outside a door element. Pure. */
export function bareDollarSites(source: string): number[] {
  const locals = importedLocalsWhere(
    source,
    (spec, name) => /(^|\/)components\/cost\/\w+$/.test(spec) && DOLLAR_TEXT_NAMES.has(name),
  );
  const viewer = importedLocalsWhere(source, (spec, name) => /(^|\/)components\/cost\/\w+$/.test(spec) && name === VIEWER_COST);
  if (locals.length === 0 && viewer.length === 0) return [];
  const uses = [
    ...locals.map((name) => new RegExp(`(?<![\\w.])${name}\\s*\\(`)),
    ...viewer.map((name) => new RegExp(`(?<![\\w.])${name}\\s*\\([^)]*unit:\\s*["'\`]usd["'\`]`)),
  ];
  const behindDoor = doorLines(source);
  const hits: number[] = [];
  codeLines(source).forEach((code, i) => {
    if (!behindDoor.has(i + 1) && code && uses.some((re) => re.test(code))) hits.push(i + 1);
  });
  return hits;
}

/** Exports of `components/cost/*` that put a price on screen. The rest of that
 *  folder (the unit switch, the rate, the cost tier, spend flags) carries no
 *  amount and may be imported anywhere. */
const COST_RENDER_NAMES = new Set([
  "Cost",
  "CostBadge",
  "AdminCost",
  "AdminPoints",
  "AdminUsd",
  "CostFigures",
  "useCostDisplay",
  "useSeesDollars",
  "useAdminCost",
  "formatAdminCost",
  "formatAdminUsd",
  "formatAdminPoints",
  "formatAdminUsdAxisTick",
  "adminCostPoints",
  "formatViewerCost",
  "formatSpendUsd",
  "costColumn",
  "adminCostColumns",
  "splitAdminCostColumns",
]);
const KIT_RENDER_NAMES = new Set(["formatCost", "formatPoints", "usdToPoints"]);

/** Literal price text that is a price on its own, wherever it appears. */
const LITERAL_ALWAYS: RegExp[] = [
  // "3 pts", `${n} pts` — "pts" is only ever our price unit
  /(?:\d[\d,.]*|\})\s*pts\b(?!\s*=)/, // (not a JSX prop named pts: `{x} pts={n}`)
  // "{n} points used", "20 points a check", "5 points left"
  /(?:\d[\d,.]*|\})\s*(?:AI\s+)?points?\s+(?:used|left|charged|spent|remaining|each|per\b|a\s+(?:check|run|month|day|week|call|record))/i,
  // a free-of-charge claim: "You were not charged", "nothing was charged", "costs nothing"
  /(?:\bnot|n't|\bnever|\bnothing\s+was|\bno\s+one\s+was)\s+charged\b/i,
  /\bcosts?\s+nothing\b/i,
  /\bno\s+(?:credits?|points?)\s+(?:used|spent|charged)\b/i,
  /\bfree\s+of\s+charge\b/i,
  /\bNo charge\b/,
  // a bare "Free" as a whole string / label / JSX text, or opening a sentence ("Free, no credits used");
  // "Free trial", "free text", "free-form" do not fire
  /(?:["'`]|>)\s*Free\s*(?:["'`<]|[,.·—–:;!](?!\w))/,
  /^\s*Free\s*$/,
  // a free allowance counted out ("3 free comparisons", `${n} free runs left`) — telling a person about
  // points and spend (owner ruling 2026-10-22)
  /(?:\d[\d,.]*|\})\s+free\s+(?:comparisons?|runs?|searches|search|checks?|lookups?|records?|uses?|tries|credits?|points?)\b/i,
];
/** "N points" is a price only beside a money word ("12 data points", a score's "+5 points" are not). */
const LITERAL_POINTS = /(?:\d[\d,.]*|\})\s*(?:AI\s+)?points?\b(?!\s*[.(\[=:?])(?!\s+(?:at|to)\b)/;
const MONEY_WORD = /cost|spen[dt]|price|charge|budget|wallet|credit|estimat|usd|points_?per|pointsPer/i;

/** True when a code line carries a literal price string. Pure. */
export function literalPriceOn(code: string): boolean {
  if (LITERAL_ALWAYS.some((re) => re.test(code))) return true;
  return MONEY_WORD.test(code) && LITERAL_POINTS.test(code);
}

/**
 * PRICE HELPERS — local hooks, components and helpers that hand a ready-made
 * price string or element to their caller. A file that imports one of these
 * (from anywhere) and uses it shows a price. Beside this maintained list, the
 * scan DERIVES more: any exported function/const in a scanned file whose name
 * matches PRODUCER_NAME and whose body itself shows a price (a literal, a
 * `components/cost` render, a kit points call, or another helper) is a price
 * helper for every file that imports it — to a fixpoint, so a helper of a
 * helper counts.
 */
export const PRICE_HELPERS: Record<string, string> = {
  usePriceText: "features/data-sources/library/hooks.ts — a source's price text",
};
export const PRODUCER_NAME = /price|cost|points?|estimat|charge/i;

/** Does an import specifier, seen from `file`, bring in `name` as a price producer? */
export type ProducerLookup = (specifier: string, name: string, file: string) => boolean;

function importedLocalsWhere(
  source: string,
  keep: (specifier: string, name: string) => boolean,
): string[] {
  const locals: string[] = [];
  const re = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (m[1]) continue;
    for (const spec of m[2].split(",")) {
      const s = spec.trim().match(/^(?:type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
      if (!s || spec.trim().startsWith("type ")) continue;
      if (keep(m[3], s[1])) locals.push(s[2] ?? s[1]);
    }
  }
  return locals;
}

/** Code lines of a source with comments blanked and import statements dropped
 *  (index = line number - 1; a dropped line is ""). Pure. */
function codeLines(source: string): string[] {
  const out: string[] = [];
  let inImport = false;
  let inBlockComment = false;
  for (const raw of source.split("\n")) {
    let line = raw;
    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end === -1) {
        out.push("");
        continue;
      }
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    line = line.replace(/\/\*.*?\*\//g, " ");
    const open = line.indexOf("/*");
    if (open !== -1) {
      inBlockComment = true;
      line = line.slice(0, open);
    }
    if (/^\s*(\*|\/\/)/.test(line)) {
      out.push("");
      continue;
    }
    const code = line.replace(/(^|[^:"'`\\])\/\/.*$/, "$1");
    if (/^\s*import\b/.test(code)) {
      inImport = !/from\s*["']/.test(code) && !/^\s*import\s*["']/.test(code);
      out.push("");
    } else if (inImport) {
      if (/from\s*["']/.test(code)) inImport = false;
      out.push("");
    } else out.push(code);
  }
  return out;
}

/** The JSX elements whose insides are BEHIND THE DOOR (owner ruling 2026-10-22): a `<CostDoor>`
 *  reveals its figures only when clicked; an `<AdminOnly>` block carries the visible admin tag. */
export const DOOR_ELEMENTS = ["CostDoor", "AdminOnly"] as const;

/** Line numbers (1-based) covered by a `<CostDoor …/>` / `<CostDoor>…</CostDoor>` / `<AdminOnly>…</AdminOnly>`
 *  element, props included. Pure. */
export function doorLines(source: string): Set<number> {
  const covered = new Set<number>();
  const lineOf = (i: number) => source.slice(0, i).split("\n").length;
  const open = new RegExp(`<(${DOOR_ELEMENTS.join("|")})\\b`, "g");
  let m: RegExpExecArray | null;
  while ((m = open.exec(source))) {
    const name = m[1];
    let depth = 0;
    let end = -1;
    let selfClosing = false;
    for (let j = m.index + m[0].length; j < source.length; j++) {
      const ch = source[j];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (depth === 0 && ch === "/" && source[j + 1] === ">") {
        end = j + 1;
        selfClosing = true;
        break;
      } else if (depth === 0 && ch === ">") {
        end = j;
        break;
      }
    }
    if (end === -1) continue;
    if (!selfClosing) {
      const close = source.indexOf(`</${name}>`, end);
      if (close !== -1) end = close;
    }
    for (let l = lineOf(m.index); l <= lineOf(end); l++) covered.add(l);
  }
  return covered;
}

/** P1 — lines where a file puts a price on screen: a use of a cost-rendering
 *  export of `components/cost/*`, a kit points call, a PRICE_HELPERS name or a
 *  derived price helper, or a literal price string. Comments and import lines
 *  excluded. Pure (the derived helpers come in through `isProducer`). */
export function costRenderSites(source: string, file = "", isProducer?: ProducerLookup): number[] {
  const locals = importedLocalsWhere(
    source,
    (spec, name) =>
      (/(^|\/)components\/cost\/\w+$/.test(spec) && COST_RENDER_NAMES.has(name)) ||
      (spec === "@ai-matrx/kit/format" && KIT_RENDER_NAMES.has(name)) ||
      Object.hasOwn(PRICE_HELPERS, name) ||
      (isProducer?.(spec, name, file) ?? false),
  );
  const uses = locals.map((name) => new RegExp(`(?<![\\w.])${name}\\b(?!\\s*:)`));
  const behindDoor = doorLines(source);
  const hits: number[] = [];
  codeLines(source).forEach((code, i) => {
    if (behindDoor.has(i + 1)) return;
    if (code && (uses.some((re) => re.test(code)) || literalPriceOn(code))) hits.push(i + 1);
  });
  return hits;
}

/** Exported functions/consts and the line span of each body (1-based, inclusive). Pure. */
export function exportRegions(source: string): { name: string; from: number; to: number }[] {
  const lines = source.split("\n");
  const starts: { name: string; at: number }[] = [];
  const topLevel: number[] = [];
  lines.forEach((line, i) => {
    const m = line.match(/^export\s+(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*(\w+)|(?:const|let)\s+(\w+))/);
    if (m) starts.push({ name: m[1] ?? m[2], at: i });
    if (/^(?:export\s|function\s|async\s|const\s|let\s|class\s|interface\s|type\s|import\s|enum\s)/.test(line)) topLevel.push(i);
  });
  return starts.map(({ name, at }) => {
    const next = topLevel.find((t) => t > at) ?? lines.length;
    return { name, from: at + 1, to: next };
  });
}

/** Strip a module path to its key: no extension, no trailing /index. Pure. */
function moduleKey(path: string): string {
  return path.replace(/\.(tsx?|mjs|js)$/, "").replace(/\/index$/, "");
}

/** Where an import specifier lands, as a module key; null for a bare package. */
function resolveSpecifier(specifier: string, fromFile: string, sharedPrefix: string): string | null {
  if (specifier.startsWith("@/")) return moduleKey(specifier.slice(2));
  if (specifier.startsWith(".")) return moduleKey(posix.normalize(posix.join(posix.dirname(fromFile), specifier)));
  void sharedPrefix;
  return null;
}

/**
 * Derive the price helpers across a set of sources (file → source), to a
 * fixpoint. Returns the lookup costRenderSites uses: a relative/`@/` import
 * resolves to its file; a bare `@ai-matrx/*` import matches by name against
 * every helper derived inside the shared packages. Pure.
 */
export function deriveProducers(sources: Map<string, string>, sharedPrefix = SHARED_PREFIX): ProducerLookup {
  const byModule = new Map<string, Set<string>>();
  const sharedNames = new Set<string>();
  const lookup: ProducerLookup = (spec, name, file) => {
    if (spec.startsWith("@ai-matrx/")) return sharedNames.has(name);
    const key = resolveSpecifier(spec, file, sharedPrefix);
    return key !== null && (byModule.get(key)?.has(name) ?? false);
  };
  const regions = new Map<string, ReturnType<typeof exportRegions>>();
  for (const [file, source] of sources) {
    const r = exportRegions(source).filter((x) => PRODUCER_NAME.test(x.name) || Object.hasOwn(PRICE_HELPERS, x.name));
    if (r.length > 0) regions.set(file, r);
  }
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const [file, rs] of regions) {
      const hits = costRenderSites(sources.get(file) ?? "", file, lookup);
      if (hits.length === 0) continue;
      const key = moduleKey(file);
      for (const r of rs) {
        if (byModule.get(key)?.has(r.name)) continue;
        if (!hits.some((h) => h >= r.from && h <= r.to)) continue;
        if (!byModule.has(key)) byModule.set(key, new Set());
        byModule.get(key)!.add(r.name);
        if (file.startsWith(sharedPrefix)) sharedNames.add(r.name);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return lookup;
}

function placeMatcher(pattern: string): (file: string) => boolean {
  if (!pattern.includes("*")) return (file) => file === pattern;
  const re = new RegExp(
    `^${pattern
      .split("/**")
      .map((part) =>
        part
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, "[^/]*"),
      )
      .join("(?:/.*)?")}$`,
  );
  return (file) => re.test(file);
}

const PLACE_MATCHERS = Object.keys(ALLOWED_PLACES).map((p) => ({ pattern: p, test: placeMatcher(p) }));

/** The ALLOWED_PLACES entry a file falls under, or null. Pure. */
export function allowedPlaceFor(file: string): string | null {
  return PLACE_MATCHERS.find((m) => m.test(file))?.pattern ?? null;
}

/** ALLOWED_PLACES entries whose reason does not name a deciding/investigating case. Pure. */
export function placesWithoutACase(places: Record<string, string> = ALLOWED_PLACES): string[] {
  return Object.entries(places)
    .filter(([, reason]) => !PLACEMENT_CASES.some((c) => reason.startsWith(`${c}: `) && reason.length > c.length + 4))
    .map(([pattern]) => pattern);
}

type Counts = Record<string, number>;
interface Baseline {
  dollars: Counts;
  placement: Counts;
  /** P2 — bare dollar strings off the admin site (shrink-only). */
  bareDollars: Counts;
}

/** The sibling aidream checkout's shared packages, keyed from this repo's root. */
export const SHARED_PREFIX = "../aidream/apps/shared/";
const SHARED_ROOT = join(ROOT, "..", "aidream");
/** The shared-package primitives that ARE the price formatter (as components/cost is here). */
const SHARED_SKIP = [
  `${SHARED_PREFIX}kit/src/format.ts`, // formatCost / formatPoints themselves
  `${SHARED_PREFIX}chat/src/host/ui-slots.tsx`, // the chat package's Cost slot the host fills (the components/cost of the package)
];

function isSharedUiFile(file: string): boolean {
  if (!/\.(ts|tsx)$/.test(file) || file.endsWith(".d.ts")) return false;
  if (/(^|\/)__(tests|fixtures|mocks)__\//.test(file) || /\.(test|spec|stories)\.tsx?$/.test(file)) return false;
  if (/\/(node_modules|dist|scripts|tests?|demo)\//.test(file)) return false;
  return !SHARED_SKIP.includes(file);
}

/** Tracked + untracked .ts/.tsx under a checkout, as repo-relative paths. */
function gitFiles(cwd: string, pathspecs: string[]): string[] {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...pathspecs], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\n")
    .filter(Boolean);
}

/** NOT A PRICE — files whose literal hits are not a price at all (a crop
 *  ratio named "Free"). Each carries its reason; the file is skipped by P1. */
export const NOT_A_PRICE: Record<string, string> = {
  "components/official/image-cropper/ImageCropper.tsx": "\"Free\" is the free-form crop ratio",
  "features/image-studio/components/InitialCropPanel.tsx": "\"Free\" is the free-form crop ratio",
  "../aidream/apps/shared/capture/src/components/ImageEditSheet.tsx": "\"Free\" is the free-form crop ratio",
  "components/image/unsplash/UnsplashSearch.tsx": "\"Free\" is Unsplash's license filter",
  "features/education/data/subjects.ts": "\"Free\" is a tier id whose label reads \"Core tools\"",
  "features/templates/files/seeds/document-templates.ts": "\"+5 pts\" is a percentage-point change in a sample report",
  "features/education/study/learning-gain/components/LearningGainReportView.tsx": "\"pts\" is a learning gain in percentage points",
  "features/masterwork/sitting/textEntrySurfaces.ts": "\"costs nothing\" means no effort, not no charge",
  "features/masterwork/understudy/UnderstudyCard.tsx": "\"costs nothing\" means no effort, not no charge",
  "features/surfaces/manifests/**": "text for agents describing a surface, never drawn",
  "providers/chatUiRegistration.ts": "host wiring: hands the cost formatter to the shared chat package, whose own files P1 scans",
  "providers/chatUiRegistrationImpl.ts": "host wiring: hands the cost formatter to the shared chat package, whose own files P1 scans",
  "features/agents/hooks/agentBuilderContextBundle.ts": "points sent into an agent's context, never drawn",
  "features/shell/frame/go-to-pages.generated.ts": "\"Free\" is the /free tools section's crumb in the generated go-to list",
};

const NOT_A_PRICE_MATCHERS = Object.keys(NOT_A_PRICE).map((p) => ({ pattern: p, test: placeMatcher(p) }));

function scanTree(): {
  counts: Counts;
  placement: Counts;
  unusedPlaces: string[];
  staleDomain: string[];
  switchIgnored: string[];
  literalRates: string[];
  sharedNote: string;
  census: { file: string; sites: number; place: string | null }[];
  bareDollars: Counts;
} {
  const bareDollars: Counts = {};
  const adminSite = ADMIN_SITE.map(placeMatcher);
  const census: { file: string; sites: number; place: string | null }[] = [];
  const listed = gitFiles(ROOT, ["*.ts", "*.tsx"]);
  const counts: Counts = {};
  const placement: Counts = {};
  const usedPlaces = new Set<string>();
  const staleDomain: string[] = [];
  const switchIgnored: string[] = [];
  const literalRates: string[] = [];
  const sources = new Map<string, string>();
  for (const file of listed) {
    if (!isUiFile(file)) continue;
    const abs = join(ROOT, file);
    if (!existsSync(abs)) continue;
    const source = readFileSync(abs, "utf8");
    for (const line of switchIgnoredSites(source)) switchIgnored.push(`${file}:${line}`);
    for (const line of literalRateSites(source)) literalRates.push(`${file}:${line}`);
    if (!adminSite.some((t) => t(file))) {
      const bare = bareDollarSites(source).length;
      if (bare > 0) bareDollars[file] = bare;
    }
    const n = countCostSites(source);
    if (file in DOMAIN_MONEY) {
      if (n === 0) staleDomain.push(file);
      continue;
    }
    if (n > 0) counts[file] = n;
    sources.set(file, source);
  }
  let sharedNote: string;
  if (existsSync(join(SHARED_ROOT, "apps", "shared"))) {
    const shared = gitFiles(SHARED_ROOT, ["apps/shared/*.ts", "apps/shared/*.tsx"]);
    let scanned = 0;
    for (const rel of shared) {
      const file = `../aidream/${rel}`;
      if (!isSharedUiFile(file) || file in DOMAIN_MONEY) continue;
      const abs = join(SHARED_ROOT, rel);
      if (!existsSync(abs)) continue;
      sources.set(file, readFileSync(abs, "utf8"));
      scanned++;
    }
    sharedNote = `P1 also scanned ${scanned} files of the sibling aidream/apps/shared packages.`;
  } else {
    sharedNote = `NOTE: P1 did NOT scan aidream/apps/shared — no sibling checkout at ${SHARED_ROOT}. Shared-package prices are unchecked on this run.`;
  }
  const isProducer = deriveProducers(sources);
  const usedExemptions = new Set<string>();
  for (const [file, source] of sources) {
    const shown = costRenderSites(source, file, isProducer).length;
    const exempt = NOT_A_PRICE_MATCHERS.find((m) => m.test(file));
    if (exempt) {
      if (shown > 0) usedExemptions.add(exempt.pattern);
      continue;
    }
    if (shown === 0) continue;
    const place = allowedPlaceFor(file);
    census.push({ file, sites: shown, place });
    if (place) usedPlaces.add(place);
    else placement[file] = shown;
  }
  for (const file of Object.keys(DOMAIN_MONEY)) {
    if (!existsSync(join(ROOT, file)) && !staleDomain.includes(file)) staleDomain.push(file);
  }
  // A glob names an area (the admin tree, billing); an exact file is a grant
  // that rots when its price leaves, so only exact files are reported unused.
  const unusedPlaces = [
    ...Object.keys(ALLOWED_PLACES).filter((p) => !p.includes("*") && !usedPlaces.has(p)),
    ...Object.keys(NOT_A_PRICE).filter((f) => !f.includes("*") && !usedExemptions.has(f)),
  ];
  return { counts, placement, unusedPlaces, staleDomain: staleDomain.sort(), switchIgnored, literalRates, sharedNote, census, bareDollars };
}

export interface Verdict {
  newSites: { file: string; count: number; baseline: number }[];
  cleared: string[];
}

/** New = a file above its baseline count (absent = 0). Pure. */
export function judge(current: Counts, baseline: Counts): Verdict {
  const newSites = Object.entries(current)
    .filter(([file, count]) => count > (baseline[file] ?? 0))
    .map(([file, count]) => ({ file, count, baseline: baseline[file] ?? 0 }))
    .sort((a, b) => a.file.localeCompare(b.file));
  const cleared = Object.keys(baseline)
    .filter((file) => (current[file] ?? 0) < baseline[file])
    .sort();
  return { newSites, cleared };
}

function readBaseline(): Baseline | null {
  if (!existsSync(BASELINE_FILE)) return null;
  const raw = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Partial<Baseline>;
  return { dollars: raw.dollars ?? {}, placement: raw.placement ?? {}, bareDollars: raw.bareDollars ?? {} };
}

const sortCounts = (counts: Counts): Counts =>
  Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));

function writeBaseline(baseline: Baseline): void {
  const out = {
    dollars: sortCounts(baseline.dollars),
    placement: sortCounts(baseline.placement),
    bareDollars: sortCounts(baseline.bareDollars),
  };
  writeFileSync(BASELINE_FILE, `${JSON.stringify(out, null, 2)}\n`);
}

/** Ratchet: each file keeps the lower of its baseline and current count; a
 *  file at zero leaves the baseline. Never adds a file or raises a count. Pure. */
export function ratchetDown(baseline: Counts, current: Counts): Counts {
  const out: Counts = {};
  for (const [file, count] of Object.entries(baseline)) {
    const now = Math.min(count, current[file] ?? 0);
    if (now > 0) out[file] = now;
  }
  return out;
}

function selfTest(): number {
  const cases: { name: string; source: string; want: number }[] = [
    { name: "R1 kit formatUsd", source: `<span>{formatUsd(run.costUsd, { digits: "adaptive" })}</span>`, want: 1 },
    { name: "R2 Intl currency", source: `new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`, want: 1 },
    { name: "R3 JSX toFixed", source: `<span>${"{"}arm.cost_usd.toFixed(3)}</span>`, want: 1 },
    { name: "R3 template toFixed", source: "const s = `$${view.costUsd.toFixed(4)}`;", want: 1 },
    { name: "R3 optional chain", source: "`${m.total_cost?.toFixed(2)}`", want: 1 },
    { name: "R3 nullish group", source: "`$${(row.spendUsd ?? 0).toFixed(2)}`", want: 1 },
    { name: "R4 glued dollar", source: `const s = "$" + total;`, want: 1 },
    { name: "the primitive", source: `<Cost usd={run.costUsd} />`, want: 0 },
    { name: "the hook", source: `const { format } = useCostDisplay(); format(costUsd)`, want: 0 },
    { name: "a duration", source: "`${seconds.toFixed(1)}s`", want: 0 },
    { name: "a comment", source: `// formatUsd(cost) is banned; "$" + x too`, want: 0 },
  ];
  let failed = 0;
  for (const c of cases) {
    const got = countCostSites(c.source);
    const ok = got === c.want;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}: got ${got}, want ${c.want}`);
  }
  const ratchet = judge({ "a.tsx": 2, "b.tsx": 1, "c.tsx": 1 }, { "a.tsx": 2, "b.tsx": 2 });
  const ratchetOk =
    ratchet.newSites.length === 1 && ratchet.newSites[0].file === "c.tsx" && ratchet.cleared.join() === "b.tsx";
  if (!ratchetOk) failed++;
  console.log(`${ratchetOk ? "PASS" : "FAIL"}  ratchet: a new file fails, a lower count is cleared`);
  const KIT = `import { formatCost } from "@ai-matrx/kit/format";\n`;
  const switchCases: { name: string; source: string; want: number }[] = [
    { name: "R5 literal points default", source: `function f(v: number, unit: CostUnit = "points") {}`, want: 1 },
    { name: "R5 destructured points default", source: `const { unit = "points" } = input;`, want: 1 },
    { name: "R6 kit formatCost with no unit", source: `${KIT}const s = formatCost(run.costUsd);`, want: 1 },
    { name: "R6 multi-line call with no unit", source: `${KIT}const s = formatCost(\n  Number(r.cost),\n);`, want: 1 },
    { name: "R6 kit formatCost with the unit", source: `${KIT}const s = formatCost(x, { unit });`, want: 0 },
    { name: "R6 unit read at call time", source: `${KIT}formatCost(x, { unit: currentCostUnit() })`, want: 0 },
    { name: "R6 a local wrapper named formatCost", source: `export function formatCost(v: number, unit: CostUnit = currentCostUnit()) {}\nformatCost(3);`, want: 0 },
    { name: "R5 default read from the store", source: `function f(unit: CostUnit = currentCostUnit()) {}`, want: 0 },
  ];
  for (const c of switchCases) {
    const got = switchIgnoredSites(c.source).length;
    const ok = got === c.want;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}: got ${got}, want ${c.want}`);
  }
  const KIT_POINTS = `import { formatCost, usdToPoints as toPts } from "@ai-matrx/kit/format";\n`;
  const rateCases: { name: string; source: string; want: number }[] = [
    { name: "R7 literal rate on formatCost", source: `${KIT_POINTS}formatCost(x, { unit, rate: 20000 })`, want: 1 },
    { name: "R7 literal rate through an alias", source: `${KIT_POINTS}toPts(x, {\n  rate: 20_000,\n})`, want: 1 },
    { name: "R7 rate from the knob", source: `${KIT_POINTS}formatCost(x, { unit, rate: currentPointsRate() })`, want: 0 },
    { name: "R7 rate from the hook", source: `${KIT_POINTS}toPts(x, { rate })`, want: 0 },
    { name: "R7 a file that does not use kit", source: `formatCost(x, { rate: 5 })`, want: 0 },
  ];
  for (const c of rateCases) {
    const got = literalRateSites(c.source).length;
    const ok = got === c.want;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}: got ${got}, want ${c.want}`);
  }

  // P1 placement — what counts as putting a price on screen.
  const COST_IMPORT = `import { Cost } from "@/components/cost/Cost";\n`;
  const placeCases: { name: string; source: string; want: number }[] = [
    { name: "P1 <Cost> in a result block", source: `${COST_IMPORT}<Cost usd={run.costUsd} />`, want: 1 },
    {
      name: "P1 the hook's format on a button",
      source: `import { useCostDisplay } from "../../components/cost/useCostDisplay";\nconst { format } = useCostDisplay();\n<Button>Check now · {format(x)}</Button>`,
      want: 1,
    },
    {
      name: "P1 an aliased admin formatter",
      source: `import { formatAdminCost as fmt } from "@/components/cost/formatAdminCost";\nconst s = fmt(1);`,
      want: 1,
    },
    { name: "P1 kit formatCost", source: `import { formatCost } from "@ai-matrx/kit/format";\nformatCost(x, { unit, rate });`, want: 1 },
    { name: "P1 kit usdToPoints", source: `import { usdToPoints } from "@ai-matrx/kit/format";\nconst p = usdToPoints(x, { rate });`, want: 1 },
    { name: "P1 literal '· N pts' on a cost", source: "const label = `Check now · ${costPts} pts`;", want: 1 },
    { name: "P1 literal points per check", source: "`${t.points_per_check} points a check`", want: 1 },
    { name: "P1 literal 'Free' for a zero cost", source: `cost === 0 ? "Free" : label`, want: 1 },
    { name: "P1 literal 'No charge' price", source: `<span>{price ? p : "No charge"}</span>`, want: 1 },
    { name: "P1 the unit switch alone", source: `import { currentCostUnit } from "@/components/cost/costUnit";\nconst u = currentCostUnit();`, want: 0 },
    { name: "P1 the rate alone", source: `import { currentPointsRate } from "@/components/cost/pointsRate";\nctx.rate = currentPointsRate();`, want: 0 },
    { name: "P1 a type-only import", source: `import type { CostProps } from "@/components/cost/Cost";\nlet p: CostProps;`, want: 0 },
    { name: "P1 data points", source: "<span>{heatmap.data.length} points</span>", want: 0 },
    { name: "P1 a score's points", source: "`dropped ${Math.abs(d)} points on ${when}`", want: 0 },
    { name: "P1 a comment", source: `// shows <Cost usd={x} /> and "3 points" of cost`, want: 0 },
    {
      name: "P1 an import named like an Object builtin",
      source: `import { toString as hastToString } from "hast-util-to-string";\nconst t = hastToString(el).trim();`,
      want: 0,
    },
  ];
  for (const c of placeCases) {
    const got = costRenderSites(c.source).length;
    const ok = got === c.want;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}: got ${got}, want ${c.want}`);
  }

  // P1 fail-then-pass: each reviewer probe fires; its fixed form (the price gone) does not.
  const probes: { name: string; bad: string; fixed: string }[] = [
    { name: "a price on a button", bad: "<button>Run check · 3 pts</button>", fixed: "<button>Run check</button>" },
    { name: "bare Free in JSX", bad: "<span>Free</span>", fixed: "<span>Ready</span>" },
    { name: "Free as a label", bad: `<Chip label="Free" />`, fixed: `<Chip label="Ready" />` },
    { name: "Free alone on a JSX line", bad: "<span>\n  Free\n</span>", fixed: "<span>\n  Ready\n</span>" },
    { name: "points used", bad: "<p>{n} points used</p>", fixed: "<p>Done</p>" },
    { name: "points a check", bad: "`${t.every} min · ${t.per} points a check`", fixed: "`every ${t.every} min`" },
    { name: "not charged", bad: `toast("You were not charged")`, fixed: `toast("Nothing changed")` },
    { name: "weren't charged", bad: `"You weren't charged for this"`, fixed: `"Try again"` },
    { name: "nothing was charged", bad: `"It failed, so nothing was charged."`, fixed: `"It failed."` },
    { name: "costs nothing", bad: `<p>This step costs nothing.</p>`, fixed: `<p>This step is instant.</p>` },
    { name: "Free, no credits used", bad: `note: "Free, no credits used"`, fixed: `note: "Done"` },
    { name: "a template pts", bad: "const s = `${n} pts`;", fixed: "const s = `${n} rows`;" },
    {
      name: "usePriceText",
      bad: `import { usePriceText } from "@/features/data-sources/library/hooks";\nconst price = usePriceText();`,
      fixed: `import { useLibrary } from "@/features/data-sources/library/hooks";\nconst lib = useLibrary();`,
    },
  ];
  for (const p of probes) {
    const bad = costRenderSites(p.bad).length;
    const fixed = costRenderSites(p.fixed).length;
    const ok = bad > 0 && fixed === 0;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  P1 probe ${p.name}: fires ${bad}, fixed ${fixed}`);
  }
  const notPrices = ["free text", "a free-form note", `"Free trial"`, `"Free-form"`, "`${rows.length} data points`", "`${d} points on ${when}`", "points at this page"];
  for (const text of notPrices) {
    const got = costRenderSites(`const s = ${text.startsWith('"') || text.startsWith("`") ? text : `"${text}"`};`).length;
    if (got !== 0) failed++;
    console.log(`${got === 0 ? "PASS" : "FAIL"}  P1 not a price: ${text}`);
  }

  // Owner ruling 2026-10-22 — a price inside <CostDoor> / <AdminOnly> is behind the door; the same price
  // printed on the page fires. A bare dollar helper off the admin site fires P2 unless it sits in a door.
  const doorProbes: { name: string; source: string; want: number }[] = [
    {
      name: "points in a footer",
      source: `import { Cost } from "@/components/cost/Cost";\nexport const F = () => <div>10 records · <Cost usd={0.02} /></div>;`,
      want: 1,
    },
    {
      name: "the same price behind a CostDoor (self-closing, multi-line props)",
      source: `import { CostDoor } from "@/components/cost/CostDoor";\nexport const F = ({ p }: { p: number }) => (\n  <CostDoor\n    rows={[{ label: "Total", text: \`\${p} points\` }]}\n  />\n);`,
      want: 0,
    },
    {
      name: "a <Cost> child inside <AdminOnly>",
      source: `import { Cost } from "@/components/cost/Cost";\nimport { AdminOnly } from "@/components/cost/AdminOnlyTag";\nexport const F = () => (\n  <AdminOnly>\n    <Cost usd={1} />\n  </AdminOnly>\n);`,
      want: 0,
    },
    { name: "a free allowance", source: "const s = `${n} free comparisons a day`;", want: 1 },
  ];
  for (const p of doorProbes) {
    const got = costRenderSites(p.source).length;
    if (got !== p.want) failed++;
    console.log(`${got === p.want ? "PASS" : "FAIL"}  P1 door probe ${p.name}: got ${got}, want ${p.want}`);
  }
  const bareProbes: { name: string; source: string; want: number }[] = [
    {
      name: "a bare dollar string",
      source: `import { formatAdminUsd } from "@/components/cost/formatAdminCost";\nexport const t = (u: number) => \`\${formatAdminUsd(u)}\`;`,
      want: 1,
    },
    {
      name: "formatViewerCost told usd",
      source: `import { formatViewerCost } from "@/components/cost/formatAdminCost";\nconst t = formatViewerCost(u, { unit: "usd", rate });`,
      want: 1,
    },
    {
      name: "formatViewerCost with the viewer's unit",
      source: `import { formatViewerCost } from "@/components/cost/formatAdminCost";\nconst t = formatViewerCost(u, { unit, rate });`,
      want: 0,
    },
    {
      name: "the dollar string inside <AdminOnly>",
      source: `import { formatAdminUsd } from "@/components/cost/formatAdminCost";\nimport { AdminOnly } from "@/components/cost/AdminOnlyTag";\nexport const F = ({ u }: { u: number }) => <AdminOnly>{formatAdminUsd(u)}</AdminOnly>;`,
      want: 0,
    },
  ];
  for (const p of bareProbes) {
    const got = bareDollarSites(p.source).length;
    if (got !== p.want) failed++;
    console.log(`${got === p.want ? "PASS" : "FAIL"}  P2 ${p.name}: got ${got}, want ${p.want}`);
  }

  // P1 derived helpers: an exported price-named helper whose body shows a price
  // carries P1 to every importer, through a helper of a helper; a price-named
  // export with no price in it does not.
  const tree = new Map<string, string>([
    ["features/v/parts.ts", "export function pointsLabel(n: number) {\n  return `${n} pts`;\n}\nexport function costTone(n: number) {\n  return n > 3;\n}\n"],
    ["features/v/line.tsx", `import { pointsLabel } from "./parts";\nexport function CostNote({ n }: { n: number }) {\n  return <i>{pointsLabel(n)}</i>;\n}\n`],
    ["features/v/Page.tsx", `import { CostNote } from "@/features/v/line";\nexport const Page = () => <CostNote n={3} />;\n`],
    ["features/v/Tone.tsx", `import { costTone } from "./parts";\nexport const Tone = () => <b>{costTone(4) ? "a" : "b"}</b>;\n`],
    [`${SHARED_PREFIX}agents/tools/price.ts`, "export function toolCostLabel(n: number) {\n  return n === 0 ? \"Free\" : `${n} pts`;\n}\n"],
    ["features/w/Chip.tsx", `import { toolCostLabel } from "@ai-matrx/agents/tools";\nexport const C = () => <i>{toolCostLabel(1)}</i>;\n`],
  ]);
  const derived = deriveProducers(tree);
  const derivedWant: Record<string, number> = {
    "features/v/Page.tsx": 1,
    "features/v/Tone.tsx": 0,
    "features/w/Chip.tsx": 1,
  };
  for (const [file, want] of Object.entries(derivedWant)) {
    const got = costRenderSites(tree.get(file)!, file, derived).length;
    if (got !== want) failed++;
    console.log(`${got === want ? "PASS" : "FAIL"}  P1 derived helper reaches ${file}: got ${got}, want ${want}`);
  }

  // P1 allowed places — the admin tree, a picker, a battle pass; a chat block does not.
  const allowCases: { file: string; want: boolean }[] = [
    { file: "app/(admin)/spend/page.tsx", want: true },
    { file: "features/admin/spend/SpendTable.tsx", want: true },
    { file: "features/workflow-runtime/bakeoff/sharp/SharpStatusBand.tsx", want: true },
    { file: "features/ai-models/components/AiModelDetailPanel.tsx", want: true },
    { file: "components/mardown-display/blocks/agent-result/AgentResultBlock.tsx", want: false },
    { file: "features/administrationx/Leak.tsx", want: false },
  ];
  for (const c of allowCases) {
    const got = allowedPlaceFor(c.file) !== null;
    const ok = got === c.want;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  P1 ${c.want ? "allowed" : "not allowed"}: ${c.file}`);
  }
  const noCase = placesWithoutACase({
    "features/a/**": "admin-gated: the admin tree",
    "features/b.tsx": "it already showed a cost",
    "features/c.tsx": "battle:",
  });
  const noCaseOk = noCase.join() === "features/b.tsx,features/c.tsx" && placesWithoutACase().length === 0;
  if (!noCaseOk) failed++;
  console.log(`${noCaseOk ? "PASS" : "FAIL"}  P1 an allowed place without a deciding/investigating reason fails`);

  // P1 fail-then-pass on the ratchet: a new doing-surface price fails; once it
  // is removed (or the count drops under the baseline, as five cleanups land)
  // it passes, and --write ratchets the baseline down, never up.
  const before = judge({ "chat/Block.tsx": 1, "old/Card.tsx": 2 }, { "old/Card.tsx": 2 });
  const after = judge({ "old/Card.tsx": 1 }, { "old/Card.tsx": 2 });
  const ratchetDownOk =
    before.newSites.map((s) => s.file).join() === "chat/Block.tsx" &&
    after.newSites.length === 0 &&
    after.cleared.join() === "old/Card.tsx" &&
    JSON.stringify(ratchetDown({ "old/Card.tsx": 2, "gone.tsx": 1 }, { "old/Card.tsx": 1, "new.tsx": 3 })) ===
      JSON.stringify({ "old/Card.tsx": 1 });
  if (!ratchetDownOk) failed++;
  console.log(`${ratchetDownOk ? "PASS" : "FAIL"}  P1 a new price fails, a removed or lower one passes, --write only ratchets down`);

  console.log(failed === 0 ? "self-test: all rules fire" : `self-test: ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

function main(): number {
  const args = new Set(process.argv.slice(2));
  if (args.has("--self-test")) return selfTest();
  if (args.has("--sites")) {
    // Print the P1 lines of the named files (local helpers only; cross-file helpers need the full scan).
    for (const file of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
      const source = readFileSync(join(ROOT, file), "utf8").split("\n");
      for (const line of costRenderSites(source.join("\n"), file)) console.log(`${file}:${line}: ${source[line - 1].trim().slice(0, 160)}`);
    }
    return 0;
  }

  const { counts: current, placement, unusedPlaces, staleDomain, switchIgnored, literalRates, sharedNote, census, bareDollars } = scanTree();
  if (args.has("--census")) {
    // Every file that puts a price on screen, with the ALLOWED_PLACES entry it rides (or none).
    for (const c of census.sort((a, b) => a.file.localeCompare(b.file))) {
      console.log(`${c.file}\t${c.sites}\t${c.place ? `${c.place} — ${ALLOWED_PLACES[c.place]}` : "NOT ALLOWED"}`);
    }
    return 0;
  }
  console.log(sharedNote);
  const baseline = readBaseline();
  if (args.has("--counts")) {
    console.log(JSON.stringify({ dollars: sortCounts(current), placement: sortCounts(placement), bareDollars: sortCounts(bareDollars) }, null, 2));
    return 0;
  }
  if (args.has("--write")) {
    if (!baseline) {
      writeBaseline({ dollars: current, placement, bareDollars });
      console.log(
        `Seeded ${BASELINE_FILE}: ${Object.keys(current).length} dollar files, ${Object.keys(placement).length} placement files.`,
      );
      return 0;
    }
    const next = {
      dollars: ratchetDown(baseline.dollars, current),
      placement: ratchetDown(baseline.placement, placement),
      bareDollars: ratchetDown(baseline.bareDollars, bareDollars),
    };
    writeBaseline(next);
    console.log(
      `Ratcheted baseline to ${Object.keys(next.dollars).length} dollar files, ${Object.keys(next.placement).length} placement files.`,
    );
    return 0;
  }

  const verdict = judge(current, baseline?.dollars ?? {});
  const placed = judge(placement, baseline?.placement ?? {});
  const bare = judge(bareDollars, baseline?.bareDollars ?? {});
  let code = 0;
  if (bare.newSites.length > 0) {
    console.log(
      `FAIL: a bare dollar figure off the admin site. Dollars are never shown to a user; an admin sees them only inside a visibly labelled element — wrap it in <AdminOnly> (components/cost/AdminOnlyTag.tsx) or put the figure in a <CostDoor usd={…}/> (${PLACEMENT_POLICY}):`,
    );
    for (const site of bare.newSites) {
      console.log(`  BARE$  ${site.file}  (${site.count} line${site.count === 1 ? "" : "s"}, baseline ${site.baseline})`);
    }
    code = 1;
  }
  const noCase = placesWithoutACase();
  if (noCase.length > 0) {
    console.log(
      `FAIL: an ALLOWED_PLACES entry has no deciding/investigating reason. Start its reason with one of: ${PLACEMENT_CASES.join(", ")} — then ": " and what the person decides or looks up there (${PLACEMENT_POLICY}):`,
    );
    for (const p of noCase) console.log(`  NO-CASE  ${p}`);
    code = 1;
  }
  if (placed.newSites.length > 0) {
    console.log(
      `FAIL: a price is shown where the person is doing their work — points appear only where someone is deciding or investigating (${PLACEMENT_POLICY}). ` +
        "Move the number to that surface's details/info view or history table if it has one, otherwise remove it (the data stays; delete the now-unused helper). " +
        "Adding the file to ALLOWED_PLACES in scripts/check-cost-display.ts needs a deciding/investigating reason " +
        `(${PLACEMENT_CASES.join(", ")}) — "it already showed a cost" is not one:`,
    );
    for (const site of placed.newSites) {
      console.log(`  PLACE  ${site.file}  (${site.count} line${site.count === 1 ? "" : "s"}, baseline ${site.baseline})`);
    }
    code = 1;
  }
  if (staleDomain.length > 0) {
    console.log("FAIL: DOMAIN_MONEY entries no longer format dollars (or are gone) — delete them:");
    for (const file of staleDomain) console.log(`  STALE  ${file}`);
    code = 1;
  }
  if (switchIgnored.length > 0) {
    console.log(
      `FAIL: a cost ignores the system-admin "Show costs in dollars" switch (always points). Take the unit from useCostDisplay() in render, or default it to currentCostUnit() (components/cost/costUnit.ts) for copy text, toasts and payloads:`,
    );
    for (const site of switchIgnored) console.log(`  SWITCH  ${site}`);
    code = 1;
  }
  if (literalRates.length > 0) {
    console.log(
      "FAIL: a points conversion hard-codes its rate. The rate is ONE setting, the billing.points_per_usd knob: pass currentPointsRate() or useCostDisplay().rate (components/cost/pointsRate.ts):",
    );
    for (const site of literalRates) console.log(`  RATE  ${site}`);
    code = 1;
  }
  if (verdict.newSites.length > 0) {
    console.log(
      `FAIL: a cost is shown in dollars. Render it with <Cost usd={…}/> (components/cost/Cost.tsx) or useCostDisplay().format — everyone sees points; only a system admin who flipped "Show costs in dollars" sees $. Real money that is not platform cost goes in DOMAIN_MONEY with its reason.`,
    );
    for (const site of verdict.newSites) {
      console.log(`  NEW  ${site.file}  (${site.count} site${site.count === 1 ? "" : "s"}, baseline ${site.baseline})`);
    }
    code = 1;
  }
  if (unusedPlaces.length > 0) {
    console.log(
      `note: ${unusedPlaces.length} ALLOWED_PLACES / NOT_A_PRICE entr${unusedPlaces.length === 1 ? "y renders" : "ies render"} no price any more — delete ${unusedPlaces.length === 1 ? "it" : "them"}: ${unusedPlaces.join(", ")}`,
    );
  }
  if (code === 0) {
    const remaining = Object.keys(current).length;
    const misplaced = Object.keys(placement).length;
    const cleared = verdict.cleared.length + placed.cleared.length;
    console.log(
      `OK: no new dollar-formatted cost and no new misplaced price. ${remaining} dollar file${remaining === 1 ? "" : "s"} and ${misplaced} misplaced-price file${misplaced === 1 ? "" : "s"} still in the baseline.` +
        (cleared > 0 ? ` ${cleared} cleared since the baseline — run --write to ratchet it down.` : ""),
    );
  }
  return code;
}

exitAfterDrain(main());
