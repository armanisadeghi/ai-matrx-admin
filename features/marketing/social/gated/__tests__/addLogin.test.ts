import { locationFromParams } from "@ai-matrx/vault";
import { addedLogin, addLoginLocation } from "../addLogin";

describe("Add <platform> login", () => {
  test("opens the Vault on a new website login named for the platform, at its address", () => {
    const loc = locationFromParams(new URLSearchParams(addLoginLocation("Instagram", "https://www.instagram.com/")));
    expect(loc.mode).toBe("new");
    expect(loc.kind).toBe("website_login");
    expect(loc.url).toBe("https://www.instagram.com/");
    expect(loc.name).toBe("Instagram login");
  });

  test("picks the login added while the window was open", () => {
    const before = new Set(["a", "b"]);
    expect(addedLogin(before, [{ itemId: "a" }, { itemId: "b" }, { itemId: "new" }])).toBe("new");
    expect(addedLogin(before, [{ itemId: "a" }, { itemId: "b" }])).toBeNull();
  });
});
