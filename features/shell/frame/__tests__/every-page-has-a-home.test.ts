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

function pages(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) pages(p, out);
    else if (name === "page.tsx" || name === "page.ts") out.push(p);
  }
  return out;
}

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

it("every page in the app has a home in the product tree", () => {
  const problems: string[] = [];
  const mapped = new Map<string, string[]>();
  for (const r of rows) {
    if (!r[1]?.trim() || !r[2]?.trim()) problems.push(`BLANK ${r[0]}`);
    if (mapped.has(r[0])) problems.push(`DUPLICATE ${r[0]}`);
    mapped.set(r[0], r);
  }
  for (const route of live) if (!mapped.has(route)) problems.push(`MISSING ${route} — add a row to route-homes.tsv`);
  for (const route of mapped.keys()) if (!live.has(route)) problems.push(`STALE ${route} — the page is gone; remove its row`);
  expect(problems).toEqual([]);
});
