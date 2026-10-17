import { safeVaultLoginUrl } from "@/features/secrets/utils";

describe("safeVaultLoginUrl", () => {
  test("accepts only absolute HTTP(S) destinations", () => {
    expect(safeVaultLoginUrl("https://example.com/login")).toBe(
      "https://example.com/login",
    );
    expect(safeVaultLoginUrl("http://localhost:3000/sign-in")).toBe(
      "http://localhost:3000/sign-in",
    );
  });

  test.each([
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "example.com/login",
    "/relative/login",
    "not a url",
  ])("refuses unsafe or ambiguous destination %s", (value) => {
    expect(safeVaultLoginUrl(value)).toBeNull();
  });
});
