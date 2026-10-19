/**
 * AT-STOREFIX (AT-WALK-E5 b-note): the Teams page logged "[tap-target] pill off-centre". The tap-target guard's pill scan judges
 * every `.rounded-full` inside a button as a pill button (tap-target-guard.ts: isPillButton / PILL_CANDIDATES); the team row's
 * badges sat inside the row's expand <button>. They are beside it now. This reads the row's own source (the page itself needs the
 * whole agents chain to render): no <Badge in the expand button's body. RED with the badges inside it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

it("keeps the team row's Badge capsules outside its expand button", () => {
  const src = readFileSync(join(__dirname, "../components/TeamManagement.tsx"), "utf8");
  const row = src.slice(src.indexOf("function TeamRow("));
  const open = row.indexOf('aria-expanded={open}');
  expect(open).toBeGreaterThan(-1);
  const start = row.lastIndexOf("<button", open);
  const end = row.indexOf("</button>", open);
  const buttonBody = row.slice(start, end);
  expect(buttonBody).not.toContain("<Badge");
  expect(row.slice(end)).toContain("<Badge");
});
