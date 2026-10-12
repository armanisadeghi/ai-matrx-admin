import { computerName, protocolMinor, CODING_MINOR } from "../matrx2Computers";

describe("reaching the person's Matrx 2 computers", () => {
  it("reads a computer's protocol minor, and only 1.38+ carries coding sessions", () => {
    expect(protocolMinor("1.38")).toBe(38);
    expect(protocolMinor("1.40")).toBeGreaterThanOrEqual(CODING_MINOR);
    expect(protocolMinor("1.37")).toBeLessThan(CODING_MINOR);
    expect(protocolMinor(null)).toBe(0);
    expect(protocolMinor("garbage")).toBe(0);
  });

  it("names a computer the way the devices list does", () => {
    expect(computerName({ id: "d", instance_name: "  Arman's Mac ", platform: null, os_version: null, app_version: null, last_seen: null, is_active: true, created_at: null })).toBe("Arman's Mac");
    expect(computerName({ id: "d", instance_name: null, platform: null, os_version: null, app_version: null, last_seen: null, is_active: true, created_at: null })).toBe("Your computer");
  });
});
