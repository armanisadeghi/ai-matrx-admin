/**
 * OAuth apps — a person registers an app other people can authorize against
 * AI Matrx (Airtable parity: "OAuth integrations"). Lane AT-OAUTH.
 *
 * The client lives in Supabase's own OAuth 2.1 server (the one aimatrx.com's
 * consent screen already serves). Registration and removal go through aidream
 * (`POST/DELETE /v1/oauth-apps`) because they need the sign-in server's admin
 * key; the secret comes back exactly once and nobody keeps a copy. The list and
 * the consent lookup are direct-to-database iam doors
 * (migrations/atoauth_a_a_person_registers_an_oauth_app.sql).
 *
 * Scopes are named as Airtable names them; aidream's Tables API admits an app
 * only to what it declared, always as the authorizing person.
 */

import type { OperationDescriptor } from "@ai-matrx/api";
import { serverApi } from "@/lib/api/server-api";
import { supabase } from "@/utils/supabase/client";

export const OAUTH_APP_SCOPES = [
  "data.records:read",
  "data.records:write",
  "schema.bases:read",
  "schema.bases:write",
] as const;
export type OAuthAppScope = (typeof OAUTH_APP_SCOPES)[number];

/** What each scope lets an app do — the consent screen and the form both read this. */
export const OAUTH_APP_SCOPE_LABELS: Record<OAuthAppScope, { label: string; description: string }> = {
  "data.records:read": { label: "Read your records", description: "See rows in tables you can see" },
  "data.records:write": { label: "Change your records", description: "Add, edit and archive rows you can edit" },
  "schema.bases:read": { label: "Read your table layouts", description: "See tables and their columns" },
  "schema.bases:write": { label: "Change your table layouts", description: "Make tables and columns" },
};

/** The data scopes an app asked for, in the fixed order, unknown names dropped. */
export function appScopeLines(scopes: readonly string[] | null | undefined) {
  const asked = new Set(scopes ?? []);
  return OAUTH_APP_SCOPES.filter((s) => asked.has(s)).map((s) => ({ scope: s, ...OAUTH_APP_SCOPE_LABELS[s] }));
}

/** Redirect addresses typed one per line (or comma separated), trimmed, blanks and repeats dropped. */
export function parseRedirectUris(text: string): string[] {
  return Array.from(new Set(text.split(/[\n,]/).map((u) => u.trim()).filter(Boolean)));
}

export interface OAuthApp {
  id: string;
  client_id: string;
  name: string;
  redirect_uris: string[];
  scopes: string[];
  created_at: string;
}

export interface RegisteredOAuthApp {
  id: string;
  client_id: string;
  /** Shown ONCE; AI Matrx keeps no copy. */
  client_secret: string;
  name: string;
  redirect_uris: string[];
  scopes: string[];
  authorize_url: string;
  token_url: string;
}

type LooseRpc = (
  fn: string,
  args?: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

function iamRpc(): LooseRpc {
  const iam = supabase.schema("iam") as unknown as { rpc: LooseRpc };
  return iam.rpc.bind(iam);
}

const REGISTER_OP: OperationDescriptor = {
  m: "POST",
  p: "/v1/oauth-apps",
  d: "aidream",
  a: "user",
  o: "required",
  n: "integrations.register_oauth_app",
};
const REMOVE_OP: OperationDescriptor = {
  m: "DELETE",
  p: "/v1/oauth-apps/{app_id}",
  d: "aidream",
  a: "user",
  o: "required",
  n: "integrations.remove_oauth_app",
};

export async function listOAuthApps(): Promise<OAuthApp[]> {
  const { data, error } = await iamRpc()("oauth_app_list");
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data as OAuthApp[]) : [];
}

/** The consent screen's lookup: null when the client is not a registered app. */
export async function getOAuthAppConsent(clientId: string): Promise<{ name: string; scopes: string[] } | null> {
  const { data, error } = await iamRpc()("oauth_app_consent", { p_client_id: clientId });
  if (error || !data || typeof data !== "object") return null;
  return data as { name: string; scopes: string[] };
}

export async function registerOAuthApp(
  organizationId: string,
  body: { name: string; redirect_uris: string[]; scopes: string[] },
): Promise<RegisteredOAuthApp> {
  return serverApi.call<RegisteredOAuthApp>(REGISTER_OP, { body }, { organizationId });
}

/** Only the owner can remove; the server checks that, so the bound organization is enough. */
export async function removeOAuthApp(appId: string): Promise<void> {
  await serverApi.call<unknown>(REMOVE_OP, { path: { app_id: appId } });
}
