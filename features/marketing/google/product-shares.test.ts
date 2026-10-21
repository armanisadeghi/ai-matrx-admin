import {
  isSharedWithMeConnection,
  sharesOfConnection,
  withSharedSearchConsole,
  type GoogleSharedResource,
} from "@/features/marketing/google/product-shares";
import type { GoogleConnectionSummary } from "@/features/marketing/google/types";

const shared = (over: Partial<GoogleSharedResource> = {}): GoogleSharedResource => ({
  resource_id: "r1",
  connection_id: "c-owner",
  resource_type: "search_console_property",
  resource_ref: "sc-domain:example.com",
  display_name: "example.com",
  product: "search_console",
  account_email: "owner@example.com",
  account_name: null,
  status: "connected",
  ...over,
});

describe("sharesOfConnection", () => {
  it("lists people and organizations the owner shared Search Console with", () => {
    const entries = sharesOfConnection({
      metadata: {
        product_shares: [{ product: "search_console", user_id: "u1" }],
        product_org_shares: [{ product: "search_console", organization_id: "o1" }],
      },
    });
    expect(entries).toEqual([
      { kind: "organization", id: "o1" },
      { kind: "user", id: "u1" },
    ]);
  });
  it("ignores other products and malformed entries", () => {
    expect(
      sharesOfConnection({
        metadata: { product_shares: [{ product: "gmail", user_id: "u1" }, null, 3] },
      }),
    ).toEqual([]);
  });
});

describe("withSharedSearchConsole", () => {
  it("adds the sharer's property under a stand-in that carries Search Console scope only", () => {
    const merged = withSharedSearchConsole({ connections: [], resources: [] }, [shared()]);
    expect(merged.resources.map((r) => r.resource_ref)).toEqual(["sc-domain:example.com"]);
    const [connection] = merged.connections;
    expect(isSharedWithMeConnection(connection)).toBe(true);
    expect(connection.scopes).toEqual(["https://www.googleapis.com/auth/webmasters.readonly"]);
  });
  it("never duplicates a connection the person already owns, and ignores other products", () => {
    const own = { id: "c-owner", metadata: {} } as unknown as GoogleConnectionSummary;
    const merged = withSharedSearchConsole({ connections: [own], resources: [] }, [
      shared(),
      shared({ resource_id: "r2", product: "gmail" }),
    ]);
    expect(merged.connections).toHaveLength(1);
    expect(merged.resources).toHaveLength(0);
  });
});
