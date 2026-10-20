import { latchedSheet } from "../useLatchedSheet";

const found = { state: "found", organizationId: "o1", retry: () => undefined } as never;
const unavailable = { state: "unavailable", why: "The record store did not answer.", retry: () => undefined } as never;
const resolving = { state: "resolving", retry: () => undefined } as never;

describe("a capture sheet that opened", () => {
  it("stays open when the store stops answering", () => {
    expect(latchedSheet(found, unavailable).state).toBe("found");
    expect(latchedSheet(found, resolving).state).toBe("found");
  });
  it("is honest before it ever opened", () => {
    expect(latchedSheet(null, unavailable).state).toBe("unavailable");
    expect(latchedSheet(null, resolving).state).toBe("resolving");
  });
});
