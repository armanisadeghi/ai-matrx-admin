import { editedAgo } from "../time";

const NOW = Date.parse("2026-10-19T18:00:00Z");

describe("editedAgo", () => {
  it("says Created for a page nobody changed after it was made", () => {
    expect(editedAgo("2026-10-19T17:10:20Z", NOW, "2026-10-19T17:10:00Z")).toBe("Created 50m ago");
  });
  it("says Edited once a person changed it later", () => {
    expect(editedAgo("2026-10-19T17:50:00Z", NOW, "2026-10-19T17:10:00Z")).toBe("Edited 10m ago");
    expect(editedAgo("2026-10-19T17:50:00Z", NOW)).toBe("Edited 10m ago");
  });
});
