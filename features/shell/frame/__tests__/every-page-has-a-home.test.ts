/**
 * NOTHING IS EVER LOST (Arman, 2026-10-20): "we've had massive amounts of code that have literally
 * been 'lost' and gone unused simply because they were left off of the menu".
 *
 * Every page in the app frame's route groups must have a home in the product tree
 * (common-docs/projects/app-frame/TREE.md). The homes live in ../route-homes.tsv:
 * route \t tree node \t how a person finds it today \t note.
 *
 * Adding a page? Add its row (dynamic /x/[id] pages take their list page's node). Removing one?
 * Remove its row. This fails on a page with no home, a blank home, a duplicate, or a stale row.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../../../..");
const APP = path.join(ROOT, "app");
const IN_SCOPE = new Set(["core", "transitional", "public", "portal", "link", "meet", "kiosk"]);
/** A route group that is deliberately not in the app frame. Every group under app/ must be listed here or in IN_SCOPE. */
const OUT_OF_SCOPE: Record<string, string> = {
  admin: "separate site (manage.aimatrx.com), counted as one node",
  "auth-pages": "sign-in and sign-up pages, not part of the frame",
  "oauth-review": "Google OAuth verification review surface",
  popup: "unused popup demo",
  dev: "internal demos site (demos.aimatrx.com)",
  lab: "fast demo site (lab.aimatrx.com)",
};
/** The first segment of every row's tree node must be one of these. */
const TOP_NODES = [
  "YOURS", "Memory", "BUILD", "Productivity", "BUSINESS", "SOLUTIONS", "MORE", "NOT TILES",
  "Account menu", "Admin", "EVERYWHERE", "Not in the app frame", "UNPLACED",
];

/** Page file extensions, read from next.config.js `pageExtensions` (the plain-extension entries). */
function pageExts(): string[] {
  const cfg = fs.readFileSync(path.join(ROOT, "next.config.js"), "utf8");
  const m = /const pageExtensions =[\s\S]*?:\s*\[([\s\S]*?)\.\.\.\(INCLUDE_DEV/.exec(cfg);
  const exts = m ? [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]) : [];
  if (!exts.length) throw new Error("could not read pageExtensions from next.config.js");
  return exts;
}
const EXTS = pageExts();
const PAGE_FILE = new RegExp(`^page\\.(${EXTS.join("|")})$`);

function pages(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    if (name.startsWith("_")) continue; // Next private folder: not a route, nor is its subtree
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) pages(p, out);
    else if (PAGE_FILE.test(name)) out.push(p);
  }
  return out;
}

const groups = fs
  .readdirSync(APP, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\(.+\)$/.test(d.name))
  .map((d) => d.name.slice(1, -1));

/** app/(core)/agents/(x)/[id]/page.tsx → { group: "core", route: "/agents/[id]" } */
function toRoute(file: string): { group: string; route: string } {
  const rel = path.relative(APP, path.dirname(file)).split(path.sep);
  const groupMatch = /^\((.+)\)$/.exec(rel[0] ?? "");
  const group = groupMatch ? groupMatch[1] : "root";
  const segs = (groupMatch ? rel.slice(1) : rel).filter((s) => s && !/^\(.+\)$/.test(s));
  return { group, route: "/" + segs.join("/") };
}

const live = new Set(
  pages(APP)
    .map(toRoute)
    .filter((r) => IN_SCOPE.has(r.group) || r.group === "root")
    .map((r) => (r.route === "/" ? "/" : r.route.replace(/\/$/, ""))),
);

const rows = fs
  .readFileSync(path.join(__dirname, "../route-homes.tsv"), "utf8")
  .split("\n")
  .slice(1)
  .filter((l) => l.trim())
  .map((l) => l.split("\t"));

it("every route group is either in the app frame or explicitly out of scope with a reason", () => {
  const unknown = groups.filter((g) => !IN_SCOPE.has(g) && !(g in OUT_OF_SCOPE));
  expect(unknown.map((g) => `UNKNOWN GROUP (${g}) — add it to IN_SCOPE or OUT_OF_SCOPE with a reason`)).toEqual([]);
});

it("every page in the app has a home in the product tree", () => {
  const problems: string[] = [];
  const mapped = new Map<string, string[]>();
  for (const r of rows) {
    if (!r[1]?.trim() || !r[2]?.trim()) problems.push(`BLANK ${r[0]}`);
    else if (!TOP_NODES.some((t) => r[1] === t || r[1].startsWith(t + " ›") || r[1].startsWith(t + " ("))) {
      problems.push(`UNKNOWN NODE ${r[0]} → "${r[1]}" — must start with one of the product-tree top nodes`);
    }
    if (mapped.has(r[0])) problems.push(`DUPLICATE ${r[0]}`);
    mapped.set(r[0], r);
  }
  for (const route of live) if (!mapped.has(route)) problems.push(`MISSING ${route} — add a row to route-homes.tsv`);
  for (const route of mapped.keys()) if (!live.has(route)) problems.push(`STALE ${route} — the page is gone; remove its row`);
  expect(problems).toEqual([]);
});
