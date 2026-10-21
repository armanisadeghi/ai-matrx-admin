/**
 * THE GUARD FOR ORGANIZATIONS STATE RULES 11-14: nothing prompts a person to
 * choose an organization. One is active from load and is never none; a person
 * with none sees ONE "Create an organization" door, a failed read says so with
 * Retry, and every other surface just uses the active organization.
 *
 * This scans every non-test .tsx for a rendered "Choose/Pick/Select an
 * organization" (or "Choose organization") phrase on a non-comment line.
 *
 * - ALLOWED: the explicit, user-initiated switch itself (the sidebar menu's
 *   picker). Listed in SWITCH_MENUS.
 * - EXEMPT: deliberate record-target pickers, each with its reason. A stale
 *   entry fails the test; a new prompt may not be added to the list to pass.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = join(__dirname, "..", "..", "..");
const SCAN_DIRS = ["features", "components", "app", "lib", "hooks", "utils"];
const PHRASE = /\b(?:Choose|Pick|Select|choose|pick|select) an? organi[sz]ation|\b[Cc]hoose organi[sz]ation/;

const SWITCH_MENUS = new Set([
  "features/organizations/components/OrganizationPickerPopover.tsx",
  "features/organizations/components/OrganizationChooser.tsx",
]);

/**
 * EXEMPT: deliberate, person-initiated controls whose whole job is choosing an
 * organization for a record or a target (not a gate that blocks work). Each
 * entry carries its reason.
 */
const EXEMPT: Record<string, string> = {
  "app/oauth/consent/ConsentClient.tsx": "OAuth consent: the person picks which organization owns the new connection",
  "features/admin/limits/components/AccountAddonsPanel.tsx": "Admin form: the admin names the target account for an add-on grant",
  "features/admin/shared-knowledge/components/AccessExplorerTab.tsx": "Admin explorer: the admin picks the organization to inspect",
  "features/admin/users/components/OrganizationsAdminClient.tsx": "Admin master-detail: the admin selects the organization to manage",
  "features/agents/org-chart/components/OrgBoxPicker.tsx": "Trigger of the organization switch popover for where new positions go",
  "features/marketing/components/brands/BrandEditorDialog.tsx": "Owning-organization field of a record the person is creating",
  "features/marketing/components/settings/MoveSiteOrganizationCard.tsx": "Move a site to another organization: the control's whole job",
  "features/marketing/components/sites/NewSiteForm.tsx": "Owning-organization field of a site the person is creating",
  "features/projects/components/ProjectFormCore.tsx": "Home-organization selector of a project the person is creating",
  "features/rag/components/library/LibraryPublishPanel.tsx": "Publish target: the person names the organization to publish into",
  "features/scopes/components/pages/ContextItemPicker.tsx": "Target selector for the context item the person is assigning",
  "features/settings/tabs/PlanUsageTab.tsx": "Billing-account selector: the person chooses which account to view",
  "features/settings/universal/ConfigurationExport.tsx": "Copy settings from/to another organization: the control's whole job",
  "features/trash/review/ChangeReviewWindow.tsx": "Move-to target: the person names the destination organization",
};

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (
      name.endsWith(".tsx") &&
      !/\.(test|spec)\.tsx$/.test(name) &&
      !full.includes(`${"/"}__tests__${"/"}`)
    ) {
      out.push(full);
    }
  }
}

function offenders(): string[] {
  const files: string[] = [];
  for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
  const hits: string[] = [];
  for (const f of files) {
    const rel = relative(ROOT, f);
    if (SWITCH_MENUS.has(rel) || rel in EXEMPT) continue;
    const lines = readFileSync(f, "utf8").split("\n");
    if (lines.some((l) => PHRASE.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l))) hits.push(rel);
  }
  return hits.sort();
}

describe("nothing prompts a person to choose an organization", () => {
  const hits = offenders();

  it("no surface renders a choose-an-organization prompt", () => {
    expect(hits).toEqual([]);
  });

  it("the exemption list has no stale entries", () => {
    const files: string[] = [];
    for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
    const matching = new Set(
      files
        .map((f) => relative(ROOT, f))
        .filter((rel) =>
          readFileSync(join(ROOT, rel), "utf8")
            .split("\n")
            .some((l) => PHRASE.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)),
        ),
    );
    expect(Object.keys(EXEMPT).filter((e) => !matching.has(e))).toEqual([]);
  });
});
