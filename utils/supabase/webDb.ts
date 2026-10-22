/**
 * utils/supabase/webDb.ts
 *
 * Marketing, crawler, and CMS records live in the dedicated `web` Postgres
 * schema. Persisted data is queried directly through Supabase under the
 * caller's JWT; the scraper service is only a live crawl command/stream edge.
 *
 *   const db = webDb(supabase); // .from(...) / .rpc(...) resolve against web
 *
 * Works with browser, SSR, and admin Supabase clients.
 */
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type WebTableName = keyof Database["web"]["Tables"];

/** A Supabase client scoped to the canonical `web` schema. */
export function webDb<C extends SupabaseClient<Database>>(client: C) {
  return client.schema("web");
}

/**
 * Raised before a web-schema request is constructed when the browser does not
 * have a usable authenticated session. This keeps session-hydration races from
 * reaching PostgREST as anonymous requests and surfacing as misleading table
 * permission errors.
 */
export class WebAuthenticationRequiredError extends Error {
  constructor(
    message = "Sign in before loading marketing data.",
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "WebAuthenticationRequiredError";
  }
}

/**
 * Resolve the caller's browser session before exposing the web query builder.
 * Every client-side marketing data service must use this helper rather than
 * calling webDb directly.
 */
export async function requireAuthenticatedSupabaseSession<
  C extends SupabaseClient<Database>,
>(client: C) {
  const claimsResult = await getClaimsUser(client)
    .catch((error: unknown) => {
      throw new WebAuthenticationRequiredError(
        "Your sign-in session could not be verified. Refresh and try again.",
        error,
      );
    });

  if (claimsResult.error || !claimsResult.data.user) {
    throw new WebAuthenticationRequiredError(
      "Your sign-in session could not be verified. Refresh and try again.",
      claimsResult.error ?? undefined,
    );
  }

  const sessionResult = await client.auth
    .getSession()
    .catch((error: unknown) => {
      throw new WebAuthenticationRequiredError(
        "Your sign-in session could not be verified. Refresh and try again.",
        error,
      );
    });

  if (sessionResult.error) {
    throw new WebAuthenticationRequiredError(
      "Your sign-in session could not be verified. Refresh and try again.",
      sessionResult.error,
    );
  }

  if (!sessionResult.data.session?.access_token) {
    throw new WebAuthenticationRequiredError();
  }

  return sessionResult.data.session;
}

/**
 * The signed-in person's id: the `confirmed_by` / `reviewed_by` every answer they give records (single-source
 * plan § 2.2). The database refuses a confirmation that names anyone else (`web._fact_person_confirms`,
 * `web._finding_person_reviews`); guard `features/marketing/__tests__/confirmWritersNamePerson.test.ts`.
 */
export async function signedInPersonId<C extends SupabaseClient<Database>>(
  client: C,
): Promise<string> {
  const session = await requireAuthenticatedSupabaseSession(client);
  return session.user.id;
}

export async function authenticatedWebDb<C extends SupabaseClient<Database>>(
  client: C,
) {
  await requireAuthenticatedSupabaseSession(client);

  return webDb(client);
}
