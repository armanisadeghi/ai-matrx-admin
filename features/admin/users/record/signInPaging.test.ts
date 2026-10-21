import { SIGN_IN_PAGE, appendSignInPage, cursorAfter, deviceOf, type SignInEvent } from "./signInPaging";

const ev = (id: string, at = "2026-10-21T20:00:00Z"): SignInEvent => ({
  id, signed_in_at: at, method: null, provider: null, aal: null, ip: null, user_agent: null,
  session_id: null, session_live: false, oauth_client: null, seeded: false,
});

describe("deviceOf", () => {
  it("names browser and OS", () => {
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36")).toBe("Chrome on Mac");
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17 Safari/604.1")).toBe("Safari on iOS");
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120.0")).toBe("Edge on Windows");
    expect(deviceOf("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0")).toBe("Firefox on Linux");
  });
  it("falls back honestly", () => {
    expect(deviceOf(null)).toBe("Unknown device");
    expect(deviceOf("")).toBe("Unknown device");
    expect(deviceOf("node")).toBe("Script");
    const odd = "SomethingOdd/1.0 with a very long agent string that goes on and on";
    expect(deviceOf(odd)).toBe(odd.slice(0, 40));
  });
});

describe("sign-in paging", () => {
  it("cursor carries the last row's time AND id", () => {
    expect(cursorAfter([])).toBeNull();
    expect(cursorAfter([ev("a", "2026-10-21T20:00:00Z"), ev("b", "2026-10-21T19:00:00Z")])).toEqual({ before: "2026-10-21T19:00:00Z", beforeId: "b" });
  });
  it("same-instant rows keep distinct ids in the cursor (the tie case)", () => {
    const tie = [ev("a"), ev("b")];
    expect(cursorAfter(tie)?.beforeId).toBe("b");
  });
  it("append drops rows already shown and takes has_more from the new page", () => {
    const merged = appendSignInPage({ items: [ev("a"), ev("b")], has_more: true }, { items: [ev("b"), ev("c")], has_more: false });
    expect(merged.items.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(merged.has_more).toBe(false);
  });
  it("page size is the RPC's default", () => {
    expect(SIGN_IN_PAGE).toBe(50);
  });
});
