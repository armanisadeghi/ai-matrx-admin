import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "features/hr/people/org-chart/HrOrgChart.tsx"),
  "utf8",
);

describe("HR org chart responsive interaction contract", () => {
  it("keeps the dotted-line switch at a 44px target below desktop", () => {
    // The switch keeps its one geometry; its label row is the 44px target.
    expect(source).toMatch(
      /htmlFor="hr-dotted-lines"\s+className="flex min-h-11 items-center[^"]*lg:min-h-0"/,
    );
  });

  it("keeps every chart-card person door at a 44px target below desktop", () => {
    expect(source).toContain(
      'className="flex min-h-11 min-w-0 flex-1 flex-col justify-center',
    );
  });
});
