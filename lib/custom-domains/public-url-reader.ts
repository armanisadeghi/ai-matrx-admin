// lib/custom-domains/public-url-reader.ts — reads the live custom-domain addresses of the organizations'
// forms, booking pages and portals (iam.org_domain_public_urls, members only), one call per organization.

import { createClient } from "@/utils/supabase/client";

export async function readOrgPublicUrls(organizationIds: readonly string[]): Promise<Record<string, string>> {
  const supabase = createClient();
  const unique = [...new Set(organizationIds.filter(Boolean))];
  const answers = await Promise.all(
    unique.map(async (organizationId) => {
      const { data, error } = await supabase.schema("iam").rpc("org_domain_public_urls", { p_organization_id: organizationId });
      if (error) {
        // The internal link still works; say why the custom address is missing.
        console.error(`[custom-domains] share addresses for ${organizationId}: ${error.message}`);
        return {};
      }
      return (data ?? {}) as Record<string, string>;
    }),
  );
  return Object.assign({}, ...answers);
}
