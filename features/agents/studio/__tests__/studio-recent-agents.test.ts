import { editedLine, recentAgents } from "../recent-agents";

const a = (over: Partial<Parameters<typeof recentAgents>[0][number]> & { id: string }) => ({
  name: over.id,
  isArchived: false,
  isOwner: true,
  accessLevel: "owner",
  updatedAt: null,
  createdAt: null,
  ...over,
});

describe("recentAgents", () => {
  it("keeps only live, named agents the person can revise, newest edit first, capped", () => {
    const out = recentAgents(
      [
        a({ id: "viewer", isOwner: false, accessLevel: "viewer", updatedAt: "2026-10-10T00:00:00Z" }),
        a({ id: "archived", isArchived: true, updatedAt: "2026-10-09T00:00:00Z" }),
        a({ id: "unnamed", name: "  ", updatedAt: "2026-10-08T00:00:00Z" }),
        a({ id: "older", updatedAt: "2026-09-01T00:00:00Z" }),
        a({ id: "editor", isOwner: false, accessLevel: "editor", updatedAt: "2026-10-05T00:00:00Z" }),
        a({ id: "created-only", createdAt: "2026-09-15T00:00:00Z" }),
      ],
      2,
    );
    expect(out.map((x) => x.id)).toEqual(["editor", "created-only"]);
  });
});

describe("editedLine", () => {
  const now = Date.parse("2026-10-17T12:00:00Z");
  it("says when, in words", () => {
    expect(editedLine({ updatedAt: "2026-10-17T11:59:30Z", createdAt: null }, now)).toBe("Edited just now");
    expect(editedLine({ updatedAt: "2026-10-17T09:00:00Z", createdAt: null }, now)).toBe("Edited 3 hours ago");
    expect(editedLine({ updatedAt: "2026-10-16T12:00:00Z", createdAt: null }, now)).toBe("Edited yesterday");
    expect(editedLine({ updatedAt: null, createdAt: "2026-08-17T12:00:00Z" }, now)).toBe("Edited 2 months ago");
  });
  it("is null with no date", () => {
    expect(editedLine({ updatedAt: null, createdAt: null }, now)).toBeNull();
  });
});
