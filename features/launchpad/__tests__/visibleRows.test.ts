// The one pick both reads use (browser `useLaunchpads`, server `readLaunchpadsOnServer`).
import { visibleLaunchpadRows, visibleTemplateRows } from "../launchpad.typed-table";

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
  it("keeps the newest of the person's own per key, across organizations (the server's own-only read)", () => {
    const picked = visibleLaunchpadRows(rows, ME, null, { organizations: false });
    expect(picked.map((r) => `${r.key}@${r._organizationId}`)).toEqual([`start@${ORG_B}`]);
  });
  it("adds every organization's launchpads, whichever organization is active (never a list filter)", () => {
    for (const active of [ORG_A, ORG_B, null]) {
      const picked = visibleLaunchpadRows(rows, ME, active);
      expect(picked.map((r) => `${r.key}@${r._organizationId}`).sort()).toEqual([`start@${ORG_B}`, `team@${ORG_A}`, `team@${ORG_B}`].sort());
    }
  });
  it("never lists a template as a launchpad, and lists the person's and the organizations' templates", () => {
    const withTemplates = [
      ...rows,
      row("sales", `template:person:${ME}`, ORG_A, "2026-10-20T10:00:00Z"),
      row("sales", `template:person:${ME}`, ORG_B, "2026-10-21T10:00:00Z"),
      row("onboard", "template:org", ORG_A, "2026-10-20T10:00:00Z"),
      row("private", "template:person:someone-else", ORG_A, "2026-10-20T10:00:00Z"),
    ];
    expect(visibleLaunchpadRows(withTemplates, ME, ORG_A).some((r) => r.owner?.startsWith("template:"))).toBe(false);
    expect(visibleTemplateRows(withTemplates, ME).map((r) => `${r.key}@${r._organizationId}`)).toEqual([`sales@${ORG_B}`, `onboard@${ORG_A}`]);
  });
  it("shows nothing to nobody", () => {
    expect(visibleLaunchpadRows(rows, null, null)).toEqual([]);
  });
});
