/**
 * BOUNDED ORGANIZATIONS, LANE C (2026-10-17): a list scoped to "my organizations" asks the SERVER
 * (`in_my_organizations`, a PostgREST computed field over `iam.is_my_organization`) — it never
 * ships an id list built from the first page of her organizations, which silently dropped every row
 * in the organizations past that page (measured live for test@test.com at page size 10: platform.tag
 * 814 of 970, crm.party 138 of 422, platform.saved_view 1085 of 1741, workflow.definition 335 of 372).
 *
 * Fail-before: every reader below built `organization_id.in.(<ids>)` / `.in("organization_id", <ids>)`
 * from `getUserOrganizations()`; this test is red on that source. Pass-after: each one reads the
 * server-side scope and none of them builds the id list.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { IN_MY_ORGANIZATIONS, IN_MY_ORGANIZATIONS_ARM, TABLES_SCOPED_TO_MY_ORGANIZATIONS } from "../inMyOrganizations";

const ROOT = resolve(__dirname, "../../../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

const READERS: Array<{ file: string; table: string; uses: "is" | "arm" }> = [
  { file: "features/agents/decision-review/service.ts", table: "platform.judge_verdict", uses: "is" },
  { file: "features/knowledge/hub/tags/tagApi.ts", table: "platform.tag", uses: "is" },
  { file: "features/knowledge/hub/hooks/useHubSidebarData.ts", table: "media.source_library", uses: "arm" },
  { file: "components/official/table-saved-views-service.ts", table: "platform.saved_view", uses: "arm" },
  { file: "features/masterwork/encore/service.ts", table: "workflow.definition", uses: "is" },
  { file: "features/content-ir/studio/records/records-service.ts", table: "content_ir.kind_instance", uses: "is" },
  { file: "features/crm/service.ts", table: "crm.party", uses: "arm" },
  { file: "features/crm/analytics/service.ts", table: "platform.outcome_event", uses: "is" },
  { file: "features/crm/outreach-lists/service.ts", table: "crm.outreach_list", uses: "arm" },
  { file: "features/crm/deals/service.ts", table: "crm.deal", uses: "arm" },
  { file: "features/crm/service.ts", table: "crm.merge_candidate", uses: "is" },
  { file: "features/crm/service.ts", table: "crm.party_merge", uses: "is" },
  { file: "features/projects/service.ts", table: "projects.projects", uses: "is" },
];

describe("org-scoped readers ask the server, never a first-page id list", () => {
  it("names the computed field and its or() arm", () => {
    expect(IN_MY_ORGANIZATIONS).toBe("in_my_organizations");
    expect(IN_MY_ORGANIZATIONS_ARM).toBe("in_my_organizations.is.true");
  });

  it.each(READERS)("$file reads $table through in_my_organizations", ({ file, table, uses }) => {
    const src = read(file);
    expect(TABLES_SCOPED_TO_MY_ORGANIZATIONS).toContain(table);
    if (uses === "is") expect(src).toMatch(/\.is\(IN_MY_ORGANIZATIONS, true\)/);
    else expect(src).toContain("IN_MY_ORGANIZATIONS_ARM");
    // The defect: an org-id list joined into a filter.
    expect(src).not.toMatch(/organization_id\.in\.\(\$\{[^}]*(orgIds|organizationIds)[^}]*\.join/);
  });

  it("no converted reader builds its scope from getUserOrganizations()", () => {
    for (const file of [
      "features/agents/decision-review/service.ts",
      "features/knowledge/hub/tags/tagApi.ts",
      "features/knowledge/hub/hooks/useHubSidebarData.ts",
      "features/masterwork/encore/service.ts",
      "features/masterwork/browse/service.ts",
      "features/crm/outreach-lists/service.ts",
      "features/crm/deals/service.ts",
    ]) {
      expect(read(file)).not.toMatch(/getUserOrganizations\(/);
    }
    const records = read("features/content-ir/studio/records/records-service.ts");
    expect(records).not.toMatch(/\.in\("organization_id", ctx\.orgIds\)/);
    const crm = read("features/crm/service.ts");
    expect(crm).not.toMatch(/\.in\("organization_id", ctx\.orgIds\)/);
    expect(crm).not.toMatch(/\.in\("organization_id", orgIds\)/);
    for (const file of ["features/crm/outreach-lists/service.ts", "features/crm/deals/service.ts"]) {
      expect(read(file)).not.toMatch(/organization_id\.in\.\(\$\{/);
    }
    const analytics = read("features/crm/analytics/service.ts");
    expect(analytics).not.toMatch(/ctx\.orgIds/);
  });

  it("masterwork browse asks the server which rulebooks its organizations list to her", () => {
    const src = read("features/masterwork/browse/service.ts");
    expect(src).toContain("listed_in_my_organizations");
    expect(src).not.toMatch(/\.in\("organization_id"/);
    expect(src).not.toMatch(/shownToBlendedFilter\(shownTo, blendedOrgIds/);
  });

  it("the scope tree reads her projects scoped by the server, never from the first organization page", () => {
    const src = read("features/scopes/service/scopesService.ts");
    const boot = src.slice(src.indexOf("sharedScopeBootRead(async"), src.indexOf("THE SCOPE TYPES AND SCOPES, FROM THE STORE"));
    expect(boot).toContain("listMyOrganizationsProjectSummaries()");
    expect(boot).not.toMatch(/listProjectSummariesInOrganizations\(orgIds\)/);
    // A project whose organization is past page 1 still gets a node: its row is asked by id.
    expect(boot).toContain("readMyOrganizationsByIds(");
  });
});
