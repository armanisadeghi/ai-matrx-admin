// ONE SOURCE FOR "WHICH WORKSPACE CAN THIS GO INTO" (AT-SNAPJOB, 2026-10-19). The Move base dialog listed the redux org
// tree (a page of the person's organizations) while Sync into another workspace searched every active organization on the
// server, so the two disagreed. Both now render OrganizationChooser (iam.my_organizations_page, active only: the store
// refuses every write into an archived organization). RED on the prior bytes: MoveBaseDialog read selectOrganizationsList.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

test("the Move base dialog and Sync into another workspace both pick from OrganizationChooser", () => {
  const base = read("features/unified-data/base/BaseScreens.tsx");
  const move = base.slice(base.indexOf("export function MoveBaseDialog"), base.indexOf("// ── snapshots"));
  expect(move).toContain("<OrganizationChooser");
  expect(move).not.toContain("selectOrganizationsList");
  expect(read("features/unified-data/connect-database/SyncIntoWorkspaceButton.tsx")).toContain("<OrganizationChooser");
});
