import { vendorOAuthErrorMessage } from "../vendorOAuthError";

const SITE = "https://www.aimatrx.com";

describe("vendorOAuthErrorMessage", () => {
  it("tells an Atlassian admin which domain to allow where", () => {
    const m = vendorOAuthErrorMessage("atlassian", SITE, "Your admin has blocked this domain https://www.aimatrx.com/api/mcp/oauth/callback", "access_denied");
    expect(m).toContain("Rovo MCP server domains");
    expect(m).toContain("https://www.aimatrx.com/**");
    expect(m.split(/[.!?]\s/).length).toBeLessThanOrEqual(2);
  });
  it("gives other providers the generic blocked-domain line", () => {
    expect(vendorOAuthErrorMessage("notion", SITE, "Your admin has blocked this domain x", "access_denied")).toContain("allow https://www.aimatrx.com/**");
  });
  it("passes any other vendor text through unchanged", () => {
    expect(vendorOAuthErrorMessage("atlassian", SITE, "User denied", "access_denied")).toBe("User denied");
    expect(vendorOAuthErrorMessage("atlassian", SITE, null, "server_error")).toBe("OAuth error from vendor: server_error");
  });
});
