/**
 * @jest-environment node
 */
import { failureMessage } from "../link-store";

describe("a refused Google link write names its reason", () => {
  it("reads the message off a Postgrest-style plain object (not '[object Object]')", () => {
    expect(failureMessage({ code: "42501", message: 'metadata key "google_link" is not system-owned' })).toContain("google_link");
  });
  it("reads Error and string failures", () => {
    expect(failureMessage(new Error("boom"))).toBe("boom");
    expect(failureMessage("plain")).toBe("plain");
  });
  it("never answers with an object dump", () => {
    expect(failureMessage({})).not.toContain("object");
    expect(failureMessage(null)).not.toContain("object");
  });
});
