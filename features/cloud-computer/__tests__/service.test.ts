import { isWaking, parseCloudComputer } from "../service";

describe("parseCloudComputer", () => {
  it("reads the server's machine view", () => {
    const m = parseCloudComputer({
      exists: true,
      status: "running",
      ready: true,
      size: "large",
      last_activity_at: "2026-10-15T00:00:00Z",
      human_control: true,
    });
    expect(m).toMatchObject({ exists: true, ready: true, size: "large", humanControl: true });
  });

  it("treats a missing machine as off, never ready", () => {
    const m = parseCloudComputer({ exists: false, status: "none", ready: false });
    expect(m.ready).toBe(false);
    expect(isWaking(m)).toBe(false);
  });

  it("follows creating, starting and shutting_down, nothing else", () => {
    for (const status of ["creating", "starting", "shutting_down"]) {
      expect(isWaking(parseCloudComputer({ exists: true, status }))).toBe(true);
    }
    for (const status of ["stopped", "running", "failed"]) {
      expect(isWaking(parseCloudComputer({ exists: true, status }))).toBe(false);
    }
  });
});
