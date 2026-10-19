// The one pick both reads use (browser `useLaunchpads`, server `readLaunchpadsOnServer`).
import { visibleLaunchpadRows } from "../launchpad.typed-table";

const ME = "87a6e699-3622-4869-8843-d0867456c0dd";
const ORG_A = "5dc930e9-bd65-44a1-8369-af773f6e1a5b";
const ORG_B = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const row = (key: string, owner: string, org: string, saved_at: string) => ({ key, owner, _organizationId: org, saved_at });

describe("visibleLaunchpadRows", () => {
  const rows = [
    row("start", `person:${ME}`, ORG_A, "2026-10-18T10:00:00Z"),
    row("start", `person:${ME}`, ORG_B, "2026-10-19T10:00:00Z"),
    row("team", "org", ORG_A, "2026-10-19T09:00:00Z"),
    row("team", "org", ORG_B, "2026-10-19T09:00:00Z"),
    row("theirs", "person:someone-else", ORG_A, "2026-10-19T11:00:00Z"),
  ];
  it("keeps the newest of the person's own per key, across organizations", () => {
    const picked = visibleLaunchpadRows(rows, ME, null);
    expect(picked.map((r) => `${r.key}@${r._organizationId}`)).toEqual([`start@${ORG_B}`]);
  });
  it("adds only the active organization's own launchpads", () => {
    const picked = visibleLaunchpadRows(rows, ME, ORG_A);
    expect(picked.map((r) => `${r.key}@${r._organizationId}`)).toEqual([`start@${ORG_B}`, `team@${ORG_A}`]);
  });
  it("shows nothing to nobody", () => {
    expect(visibleLaunchpadRows(rows, null, null)).toEqual([]);
  });
});
