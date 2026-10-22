/**
 * The app's inputs to `@ai-matrx/data/access` — injected once, the first time any access service
 * wrapper is loaded. The services themselves live in the package; this file only hands it the
 * browser Supabase client (called per use, never cached), the app's direct-message sender, the
 * app's system organization id, the app's PINNED-KEY claims reader (no JWKS fetch on a cold page),
 * the organization-carrying fetch, and the website/page tokens the CMS resolves itself.
 */
import { configureAccess } from "@ai-matrx/data/access";
import { createClient } from "@/utils/supabase/client";
import {
  sendDirectActionMessage,
  type SendDirectActionMessageArgs,
} from "@/features/messaging/service/sendDirectActionMessage";
import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { fetchWithOrganization } from "@/lib/organizations/fetchWithOrganization";
import {
  CMS_SITE_MEMBER_ADD_ACTION,
  cmsAccessGateLabel,
  cmsSiteAccessRequestKey,
  isCmsAccessGateToken,
} from "@/features/cms/accessGateTokens";

let configured = false;

/**
 * Injects the app's inputs into `@ai-matrx/data/access` (once). The service wrappers CALL this
 * before every delegated call rather than relying on a bare side-effect import: the app's
 * package.json sets `"sideEffects": false`, so a bundler may skip an import that is only there for
 * its side effect, or link a pure re-export straight to the package.
 */
export function ensureAccessEnv(): void {
  if (configured) return;
  configureAccess({
    getClient: () => createClient(),
    // The package builds the same action envelopes the app's own copy built (kinds and payloads are
    // unchanged); only the declared type is wider.
    sendDirectActionMessage: (args) =>
      sendDirectActionMessage(args as SendDirectActionMessageArgs),
    platformOrgIds: { systemOrganizationId: SYSTEM_ORGANIZATION_ID },
    // Two installed copies of auth-js can differ by patch version; the shape used is identical.
    getClaimsUser: (client) => getClaimsUser(client as unknown as Parameters<typeof getClaimsUser>[0]),
    // The package passes an explicit organization positionally; the app's fetch takes it as an option.
    fetchWithOrganization: (input, init, organizationId) =>
      fetchWithOrganization(input, init, organizationId === undefined ? undefined : { organizationId }),
    entityTokens: {
      isCmsAccessGateToken,
      cmsAccessGateLabel: (token) => (isCmsAccessGateToken(token) ? cmsAccessGateLabel(token) : "item"),
      siteMemberAddAction: CMS_SITE_MEMBER_ADD_ACTION,
      siteAccessRequestKey: cmsSiteAccessRequestKey,
    },
  });
  configured = true;
}

ensureAccessEnv();
