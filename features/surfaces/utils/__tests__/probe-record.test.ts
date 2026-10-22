/** The probe record is read from ui_surface.last_check (surface declarations W0-D). */
import { parseProbeRecord, probeUrl } from "../probe-record";

describe("parseProbeRecord", () => {
  it("reads a probe's fields and builds its URL", () => {
    const p = parseProbeRecord({
      at: "2026-10-22T16:16:05.220Z",
      base: "https://www.aimatrx.com/",
      route: "/notes/3b45a907",
      status: "fail",
      recordId: "3b45a907",
      declaredOn: ["note_title", 4],
      suppliedValues: ["note_title"],
      missing: ["chair"],
      probedAs: { role: "admin", email: "admin@admin.com", userId: "u1" },
      result: "certified",
    });
    expect(p?.status).toBe("fail");
    expect(p?.declaredOn).toEqual(["note_title"]);
    expect(p?.missing).toEqual(["chair"]);
    expect(p?.probedAs?.email).toBe("admin@admin.com");
    expect(p?.values).toBeNull();
    expect(p && probeUrl(p)).toBe("https://www.aimatrx.com/notes/3b45a907");
  });

  it("is null when no probe wrote a status (a certification ledger alone is not a probe)", () => {
    expect(parseProbeRecord({ result: "certified" })).toBeNull();
    expect(parseProbeRecord(null)).toBeNull();
    expect(parseProbeRecord([])).toBeNull();
  });
});
