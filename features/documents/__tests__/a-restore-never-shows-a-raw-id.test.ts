jest.mock("@/components/ui/use-toast", () => ({ toast: jest.fn() }));
import { restoredLabel } from "../components/DocumentHistoryViewer";

describe("restoredLabel", () => {
  it("uses the version's own label", () => {
    expect(restoredLabel("Before the edit", "2026-10-11T17:06:00Z")).toBe("Restored from Before the edit");
  });
  it("uses when it was saved, never an id", () => {
    const out = restoredLabel(null, "2026-10-11T17:06:30Z");
    expect(out).toMatch(/^Restored from the version saved /);
    expect(out).not.toMatch(/[0-9a-f]{8}-/);
  });
  it("still says something with nothing known", () => {
    expect(restoredLabel(null, null)).toBe("Restored from an earlier version");
  });
});
