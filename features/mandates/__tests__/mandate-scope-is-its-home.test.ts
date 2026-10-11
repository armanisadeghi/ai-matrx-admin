// A mandate's scope is its HOME organization, never the viewer's perspective.
// Red before 2026-10-10: a shortcut homed in "Cedar Ridge Physical Therapy"
// exported (and printed) "Personal" because the person-perspective page asked
// who was looking instead of where the mandate lives.
import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";
import { mandateScopeLabel } from "../mandate-home";
import { buildMandateDefinitionCore } from "../workspace/MandateAlchemy";
import type { MandateWorkspaceData } from "../workspace/useMandateWorkspaceData";

jest.mock("@ai-matrx/alchemy/react", () => ({ ContentTransferMenu: () => null }));

const HOME = "bb6fec2f-e635-40b0-8e78-5b610e8bc65e";

function data(organizationId: string | null): MandateWorkspaceData {
  return {
    mandate: {
      mandate_key: "shortcut.zz_scope_check",
      organization_id: organizationId,
      is_enabled: true,
      output_kind: null,
    },
    offer: null,
    contract: { requiredVariables: [], requiredOutputKeys: [] },
  } as unknown as MandateWorkspaceData;
}

describe("a mandate's scope is where it lives", () => {
  it("an org-homed mandate reads as its organization", () => {
    expect(mandateScopeLabel(HOME, "Cedar Ridge Physical Therapy")).toBe("Cedar Ridge Physical Therapy");
  });
  it("system-homed reads System; unknown org and no home say so", () => {
    expect(mandateScopeLabel(SYSTEM_ORGANIZATION_ID, null)).toBe("System");
    expect(mandateScopeLabel(HOME, null)).toBe("An organization you are not in");
    expect(mandateScopeLabel(null, null)).toBe("No home organization");
  });
  it("the exported definition core carries the home, never 'Personal'", () => {
    const core = buildMandateDefinitionCore(data(HOME), "Cedar Ridge Physical Therapy") as { scope: string };
    expect(core.scope).toBe("Cedar Ridge Physical Therapy");
  });
});
