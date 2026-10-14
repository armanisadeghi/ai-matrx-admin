import { missingReadScopes, type CustomerSocialConnection, type SocialProviderConfig } from "../customer-service";

const connection = (provider: CustomerSocialConnection["provider"], grantedScopes: string[]): CustomerSocialConnection => ({
  id: "c", provider, status: "connected", accountName: null, providerSubject: null, issuer: null, grantedScopes,
});
const config = (provider: SocialProviderConfig["provider"], scopes: string[]): SocialProviderConfig => ({ provider, status: "available", scopes });

describe("Grant insights access is offered only when a reconnect would actually add a read scope", () => {
  it("offers the Instagram read scopes consent asks for and the grant lacks", () => {
    expect(missingReadScopes(connection("instagram", ["instagram_business_basic"]),
      config("instagram", ["instagram_business_basic", "instagram_business_manage_insights", "instagram_business_manage_comments"])))
      .toEqual(["instagram_business_manage_insights", "instagram_business_manage_comments"]);
  });
  it("offers nothing when Facebook consent (its login configuration) does not ask for the reads yet", () => {
    expect(missingReadScopes(connection("facebook", ["pages_show_list"]), config("facebook", ["pages_show_list", "pages_read_engagement"]))).toEqual([]);
  });
  it("offers nothing once granted, and nothing for providers without read scopes", () => {
    expect(missingReadScopes(connection("threads", ["threads_basic", "threads_manage_insights", "threads_read_replies"]),
      config("threads", ["threads_basic", "threads_manage_insights", "threads_read_replies"]))).toEqual([]);
    expect(missingReadScopes(connection("twitch", []), config("twitch", ["user:read:email"]))).toEqual([]);
  });
});
