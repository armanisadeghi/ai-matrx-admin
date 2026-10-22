/** What to tell a person when a vendor's OAuth page refuses this site's domain. */
const BLOCKED_DOMAIN = /blocked\s+this\s+domain|domain.*(?:not\s+allowed|blocked)/i;

export function vendorOAuthErrorMessage(
  serverSlug: string,
  siteOrigin: string,
  vendorText: string | null,
  vendorCode: string,
): string {
  const text = vendorText ?? "";
  if (BLOCKED_DOMAIN.test(text) || BLOCKED_DOMAIN.test(vendorCode)) {
    return /atlassian|jira|rovo/i.test(serverSlug)
      ? `Your Atlassian admin has blocked this site. Ask them to allow ${siteOrigin}/** under Rovo MCP server domains, then connect again.`
      : `Your admin has blocked this site. Ask them to allow ${siteOrigin}/** in the provider's admin settings, then connect again.`;
  }
  return text || `OAuth error from vendor: ${vendorCode}`;
}
