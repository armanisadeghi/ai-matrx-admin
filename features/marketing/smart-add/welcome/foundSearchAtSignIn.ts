/**
 * Sign-up welcome — the found search STARTS ON THE SERVER at sign-in (SIGNUP-WELCOME.md § The flow).
 *
 * Why here (live, 2026-10-20): the two real accounts that confirmed their email that day landed on /welcome and left
 * for the home page about five seconds later, before the browser's start (an idle wait, then five calls in a row)
 * reached its first write; one of them was captured as `[found-search] … could not save its progress: Failed to
 * fetch`. Neither came back, so "the next load tries again" never ran. A start that needs the person to stay on one
 * page is not a start.
 *
 * So every sign-in door (the email-confirm link, the OAuth callback, a password sign-in) hands its fresh session to
 * `scheduleFoundSearchAtSignIn`, which runs the one start (foundSearchStart.ts) AFTER the response is sent (`after`):
 * the person is redirected at once and waits on nothing, and the round runs on aidream detached. Everything acts as
 * the person, with their own access token: their account record, their known-domain read, their own organization,
 * their run. The browser island stays only to watch the round and tell them (and to retry a start that did not land).
 */

import { after } from "next/server";
import { createClient, type Session } from "@supabase/supabase-js";
import { applyOrganizationContextHeader, buildMatrxRequestUrl, readMatrxJsonResponse, sendMatrxRequest } from "@ai-matrx/api";
import { readCallerMemberships } from "@ai-matrx/auth/organizations";
import { AIDREAM_PRODUCTION_URL } from "@/lib/api/endpoints";
import { testRunHeaders } from "@/lib/test-run/marker";
import { knownDomainRulesFromSnapshot, type KnownDomainRule, type KnownDomainSnapshotRow } from "@/lib/web-domains/registry";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { foundSearchNext, type FoundSearchState } from "./foundSearchState";
import { foundStateMetadata, startFoundSearchWith, type FoundSearchStartResult } from "./foundSearchStart";
import { IDENTIFY_WORKFLOW_KEY } from "./welcomeRound";

/** The sign-in door that handed over the session (recorded on a failure). */
export type FoundSearchDoor = "email_confirm" | "oauth_callback" | "password_login" | "phone_otp";

/** A person who belongs to several organizations at sign-in: only the browser knows which one is active. */
class NoSingleOrganization extends Error {}

const SYSTEM_RUNS_PATH = "/workflows/system/{key}/runs";

function authEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("The found search could not start: the database address is not configured.");
  return { url, key };
}

async function authUser(accessToken: string, init?: { method: "PUT"; body: string }) {
  const { url, key } = authEnv();
  const response = await fetch(`${url}/auth/v1/user`, {
    method: init?.method ?? "GET",
    headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: init?.body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`The auth server answered ${response.status} to the found search.`);
  return (await response.json()) as Session["user"];
}

/** Run the first round's start as the holder of `accessToken`. Exported for the sign-in doors' guard test. */
export async function startFoundSearchOnServer(accessToken: string): Promise<FoundSearchStartResult> {
  const { url, key } = authEnv();
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  let userId = "";
  let testRunId: string | null = null;
  return startFoundSearchWith({
    freshUser: async () => {
      const user = await authUser(accessToken);
      userId = user.id;
      const fixture = (user.app_metadata?.test_fixture ?? null) as { test_run_id?: unknown } | null;
      testRunId = typeof fixture?.test_run_id === "string" ? fixture.test_run_id : null;
      return user;
    },
    rules: async (): Promise<readonly KnownDomainRule[] | null> => {
      const { data, error } = await (db.schema("web") as unknown as {
        rpc(name: string): PromiseLike<{ data: KnownDomainSnapshotRow[] | null; error: { message: string } | null }>;
      }).rpc("domain_categories_snapshot");
      // Without the registry the email domain is never a website (unknown is never guessed); the email still searches.
      if (error) {
        console.error(`[found-search] Known web domains could not be read at sign-in: ${error.message}`);
        return null;
      }
      return knownDomainRulesFromSnapshot(data ?? []);
    },
    organizationId: async () => {
      const memberships = await readCallerMemberships({
        auth: { getClaims: async () => ({ data: { claims: { sub: userId } }, error: null }) },
        schema: (name: string) => db.schema(name),
      });
      if (memberships === null) throw new Error("The found search could not read the account's organizations.");
      // A new account owns exactly one: the organization made with it. More than one = the browser's active one.
      if (memberships.length !== 1) throw new NoSingleOrganization();
      return memberships[0].id;
    },
    writeState: async (patch: Partial<FoundSearchState>) => {
      await authUser(accessToken, { method: "PUT", body: JSON.stringify({ data: foundStateMetadata(patch) }) });
    },
    runExists: async () => {
      // The server starts only a first round (a later one needs the browser's new information).
      throw new Error("The sign-in start never looks up a later round.");
    },
    startRun: async ({ subject, organizationId, inputs }) => {
      const response = await sendMatrxRequest(
        buildMatrxRequestUrl(AIDREAM_PRODUCTION_URL, SYSTEM_RUNS_PATH, { key: IDENTIFY_WORKFLOW_KEY }),
        {
          method: "POST",
          headers: applyOrganizationContextHeader(
            { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...testRunHeaders(testRunId) },
            organizationId,
          ),
          body: JSON.stringify({ subject, source_feature: "marketing", mode: "detached", inputs }),
        },
        { timeoutMs: 20_000 },
      );
      const started = await readMatrxJsonResponse<{ run_id?: unknown }>(response);
      if (typeof started?.run_id !== "string" || !started.run_id) throw new Error("The identify run started without a run id.");
      return { runId: started.run_id };
    },
  });
}

async function recordFailure(error: unknown, userId: string, door: FoundSearchDoor): Promise<void> {
  const text = error instanceof Error ? error.message : String(error);
  console.error(`[found-search] The sign-in start failed (${door}); the browser retries on the next load.`, error);
  const { error: recordError } = await createAdminClient()
    .schema("ops")
    .rpc("record_system_error", {
      p_error: {
        kind: "signup_welcome:found-search-start",
        error_text: `The sign-in start of the found search failed: ${text}`,
        error_type: error instanceof Error ? error.name : "Error",
        metadata: { door, boundary: "found_search_at_sign_in" },
        user_id: userId,
        route: door === "email_confirm" ? "/auth/confirm" : door === "oauth_callback" ? "/auth/callback" : "/login",
        source_app: "matrx-frontend",
      },
    });
  if (recordError) console.error(`[found-search] The failure could not be recorded: ${recordError.message}`);
}

/**
 * Hand a fresh sign-in session to the found search. Costs the sign-in nothing: the decision reads the session it
 * already holds, and the start runs after the response is sent. Only an account that never started is started.
 */
export function scheduleFoundSearchAtSignIn(session: Pick<Session, "access_token" | "user"> | null | undefined, door: FoundSearchDoor): void {
  if (!session?.access_token || !session.user) return;
  if (foundSearchNext(session.user) !== "start") return;
  const { access_token: token, user } = session;
  after(async () => {
    try {
      const result = await startFoundSearchOnServer(token);
      console.info(`[found-search] sign-in start (${door}): ${result.outcome}${result.outcome === "started" ? ` run ${result.runId}` : ""}`);
    } catch (error) {
      if (error instanceof NoSingleOrganization) {
        console.info(`[found-search] sign-in start (${door}) left to the browser: the account has several organizations`);
        return;
      }
      await recordFailure(error, user.id, door).catch(() => undefined);
    }
  });
}
