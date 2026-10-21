import { AuthClient } from "@supabase/supabase-js";
import { createClient as createDataClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { assertNotInSupportSession } from "@/features/admin/users/support-sessions/service";
import type { Database } from "@/types/database.types";

type Client = Pick<ReturnType<typeof createClient>, "auth">;
export interface AuthenticatorFactor { id: string; name: string; verified: boolean }
export interface AuthenticatorState { userId: string; factors: AuthenticatorFactor[]; elevated: boolean }
export interface AuthenticatorSetup { id: string; qrCode: string; secret: string; cancel: () => Promise<void> }
export interface AuthenticatorAuthority { authUrl: string; publishableKey: string; guard: (accessToken: string) => Promise<void> }

function authority(): AuthenticatorAuthority {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Authentication is unavailable.");
  return {
    authUrl: `${url.replace(/\/$/, "")}/auth/v1`,
    publishableKey: key,
    guard: async accessToken => {
      const bound = createDataClient<Database>(url, key, {
        accessToken: async () => accessToken,
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      await assertNotInSupportSession(bound);
    },
  };
}

async function snapshot(client: Client, expectedUserId?: string) {
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error("Sign in to manage authenticators.");
  const { data, error: userError } = await client.auth.getUser(session.access_token);
  if (userError) throw userError;
  if (!data.user || (expectedUserId && data.user.id !== expectedUserId)) throw new Error("Your sign-in changed. Reload authenticators.");
  return { accessToken: session.access_token, user: data.user };
}

/** One signed identity supplies both factors and assurance, even if the ambient login changes. */
export async function readAuthenticators(client: Client = createClient()): Promise<AuthenticatorState> {
  const { accessToken, user } = await snapshot(client);
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel(accessToken);
  if (error) throw error;
  return {
    userId: user.id,
    factors: (user.factors ?? []).filter(factor => factor.factor_type === "totp").map(factor => ({
      id: factor.id, name: factor.friendly_name || "Authenticator", verified: factor.status === "verified",
    })),
    elevated: data.currentLevel === "aal2",
  };
}

async function boundAuth(expectedUserId: string, client: Client, destination: AuthenticatorAuthority) {
  const { accessToken } = await snapshot(client, expectedUserId);
  await destination.guard(accessToken);
  // Every request, including the support-session guard, is bound to the initiating token.
  // No refresh token or MFA secret is persisted in this separate Auth client.
  return new AuthClient({
    url: destination.authUrl, headers: { apikey: destination.publishableKey, Authorization: `Bearer ${accessToken}` },
    hasCustomAuthorizationHeader: true, persistSession: false,
    autoRefreshToken: false, detectSessionInUrl: false,
  });
}

export async function enrollAuthenticator(expectedUserId: string, name: string, client: Client = createClient(), destination: AuthenticatorAuthority = authority()): Promise<AuthenticatorSetup> {
  const label = name.trim();
  if (!label || label.length > 64) throw new Error("Enter an authenticator name of up to 64 characters.");
  const auth = await boundAuth(expectedUserId, client, destination);
  const { data, error } = await auth.mfa.enroll({ factorType: "totp", friendlyName: label, issuer: "AI Matrx" });
  if (error) throw error;
  return { id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, cancel: async () => {
    const { data: current, error: readError } = await auth.getUser();
    if (readError) throw readError;
    // A verification that finished during unmount must never be undone by cleanup.
    if (!current.user?.factors?.some(factor => factor.id === data.id && factor.status === "unverified")) return;
    const { error: cancelError } = await auth.mfa.unenroll({ factorId: data.id });
    if (cancelError) throw cancelError;
  } };
}

export async function verifyAuthenticator(expectedUserId: string, factorId: string, code: string, client: Client = createClient(), destination: AuthenticatorAuthority = authority()): Promise<void> {
  if (!/^\d{6}$/.test(code)) throw new Error("Enter the six-digit authenticator code.");
  const auth = await boundAuth(expectedUserId, client, destination);
  const { error } = await auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw error;
  // Auth updates the original session's AMR. Refresh the CURRENT browser session,
  // without installing the separate client's token into a possibly changed login.
  const { error: refreshError } = await client.auth.refreshSession();
  if (refreshError) throw refreshError;
}

export async function removeAuthenticator(expectedUserId: string, factorId: string, client: Client = createClient(), destination: AuthenticatorAuthority = authority()): Promise<void> {
  const auth = await boundAuth(expectedUserId, client, destination);
  const { error } = await auth.mfa.unenroll({ factorId });
  if (error) throw error;
  const { error: refreshError } = await client.auth.refreshSession();
  if (refreshError) throw refreshError;
}

/** Do not reflect provider payloads, codes, or secrets into the interface. */
export function authenticatorError(reason: unknown): string {
  const code = reason && typeof reason === "object" && "code" in reason ? reason.code : null;
  if (reason instanceof Error && reason.message === "Login details can't be changed during a support session.") return reason.message;
  if (reason instanceof Error && reason.message === "Your sign-in changed. Reload authenticators.") return reason.message;
  if (code === "mfa_verification_failed") return "That code wasn’t accepted. Enter a new code.";
  if (code === "insufficient_aal") return "Verify an authenticator, then try again.";
  if (code === "mfa_factor_name_conflict") return "That authenticator name is already in use.";
  if (code === "too_many_enrolled_mfa_factors") return "Remove an unused authenticator before adding another.";
  return "Couldn’t complete that action. Try again.";
}
