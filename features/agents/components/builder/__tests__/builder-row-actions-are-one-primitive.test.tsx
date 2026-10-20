/**
 * EVERY BUILDER ROW'S ADD / BATCH IS ONE PRIMITIVE (review 2, #22, 2026-10-19).
 *
 * At 375px Variables and Tools drew "+ Add / Batch" as words while Context policy and Resources
 * drew bare icons, each row hand-building its button with its own rule. And the System toolbar
 * showed two identical "…" buttons (format overflow, actions sheet).
 */
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BuilderRowAction } from "../BuilderRowAction";

const ROOT = path.resolve(__dirname, "../..");
const ROWS = [
  "variables-management/AgentVariablesManager.tsx",
  "tools-management/AgentToolsRow.tsx",
  "context-policies-management/AgentContextPoliciesManager.tsx",
  "builder/AgentResourcesManager.tsx",
  "builder/AgentTermListsManager.tsx",
];

describe("builder row actions", () => {
  it("the primitive is an icon with its word from sm up, the word always the accessible name", () => {
    const add = renderToStaticMarkup(<BuilderRowAction kind="add" />);
    expect(add).toContain('aria-label="Add"');
    expect(add).toContain("<svg");
    expect(add).toContain('class="hidden sm:inline"');
    expect(renderToStaticMarkup(<BuilderRowAction kind="batch" />)).toContain('aria-label="Batch"');
  });

  for (const file of ROWS) {
    it(`${file} draws its actions with the primitive, not a hand-built button`, () => {
      const source = fs.readFileSync(path.join(ROOT, file), "utf8");
      expect(source).toContain("BuilderRowAction");
      expect(source).not.toMatch(/px-2\.5 py-1 text-xs text-muted-foreground/);
      expect(source).not.toMatch(/@\[22rem\]\/(policy|resource)-row:inline/);
    });
  }

  it("the System and message toolbars give the actions trigger an icon unlike the format \"…\"", () => {
    for (const file of ["builder/message-builders/system-instructions/SystemMessageButtons.tsx", "builder/message-builders/MessageItemButtons.tsx"]) {
      expect(fs.readFileSync(path.join(ROOT, file), "utf8")).toContain("mobileMoreIcon={EllipsisVertical}");
    }
    expect(fs.readFileSync(path.resolve(ROOT, "../../../components/official/ResponsiveIconButtonGroup.tsx"), "utf8")).toContain("icon={mobileMoreIcon}");
  });
});
