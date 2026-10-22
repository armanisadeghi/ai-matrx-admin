/**
 * Studio polish round 2: the empty describe box's "…" holds no registry actions, one example count everywhere,
 * the Import page's promised instructions box exists on the first screen, the admin error pill never moves
 * the Studio (it rises off the composer), and no shared admin surface prefetches a main-app route with next/link.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("Studio start", () => {
  it('the describe box opts out of the shared action registry ("…" has nothing that applies to an empty prompt)', () => {
    expect(src("features/agents/studio/components/StudioStart.tsx")).toMatch(/menuActions="none"/);
    expect(src("components/official/ProTextarea.tsx")).toMatch(/menuActions !== "none"/);
  });
  it("From my examples counts with the same ProofCount as Describe it (one number, not 2 vs 3)", () => {
    const ex = src("features/agents/studio/components/ExamplesStart.tsx");
    expect(ex).toMatch(/<ProofCount count=\{given\.length\}/);
    expect(ex).not.toMatch(/needed`/);
  });
});

describe("Import from Claude", () => {
  it("the first screen has the project-instructions box its own step promises", () => {
    const f = src("features/agents/studio/bring-over/FromClaudeAccount.tsx");
    expect((f.match(/<ContextField /g) ?? []).length).toBe(2);
    expect(f).toMatch(/instructions in the box below/);
  });
});

describe("Admin error pill", () => {
  it("the Studio page never makes room for it — the pill rises off the composer instead", () => {
    expect(src("features/agents/studio/components/AgentStudioPage.tsx")).not.toContain("--shell-fixed-corner-clearance");
    expect(src("features/admin/error-inspector/ErrorInspectorBadge.tsx")).toContain("useFloatingLift");
  });
});

describe("manage.* prefetch CORS class", () => {
  it.each([
    "components/official/MatrxDataTableHost.tsx",
    "components/official/cards/CardGrid.tsx",
    "components/official/card-and-grid/Card.tsx",
    "components/official/card-and-grid/HorizontalCard.tsx",
    "components/official/FloatingDock.tsx",
    "features/agents/factory/components/FactoryDoorsTable.tsx",
    "features/agents/factory/components/FactoryBuildPage.tsx",
    "features/agents/factory/components/BuildProgress.tsx",
  ])("%s links through AppLink, never raw next/link", (file) => {
    const s = src(file);
    expect(s).not.toMatch(/from ['"]next\/link['"]/);
    expect(s).toMatch(/navigation\/AppLink/);
  });

  it("the link every design-system component draws through (KpiTile, tap buttons) is AppLink", () => {
    const s = src("components/icons/tap-target-setup.ts");
    expect(s).not.toMatch(/from ['"]next\/link['"]/);
    expect(s).toMatch(/navigation\/AppLink/);
  });
});
