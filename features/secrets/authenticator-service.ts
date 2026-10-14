/**
 * Matrx Authenticator — client for the GA manage surface (aidream
 * `/api/authenticator/*`).
 *
 * This client never receives a seed. The signed-in Vault owner may request the
 * current short-lived code for display; enrollment responses remain metadata.
 *
 * Spec: common-docs/systems/apps/matrx-authenticator/FEATURE.md
 */

import { createClient } from "@/utils/supabase/client";
import { applyOrganizationContextHeader } from "@/lib/api/organization-context";
import type {
  AuthenticatorCode,
  AuthenticatorEntry,
} from "./authenticator-types";
import { AIDREAM_PRODUCTION_URL } from "@/lib/api/endpoints";
import {
  BackendApiError,
  buildMatrxRequestUrl,
  readMatrxJsonResponse,
  sendMatrxRequest,
} from "@ai-matrx/api";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";

function backendBase(): string {
  return AIDREAM_PRODUCTION_URL;
}

async function authHeaders(
  json: boolean,
  method: string,
): Promise<{
  organizationId: string;
  headers: Record<string, string>;
  userId: string;
}> {
  // ORG-GATE-AUDIT: THE GATE, never the bare kernel. Enrolling or removing an
  // authenticator with no organization selected asks, then continues this
  // same request; the polled current-code read never opens a dialog.
  const organizationId = await ensureOrgId(null);
  const organizationHeaders = applyOrganizationContextHeader({}, organizationId);
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");
  const headers: Record<string, string> = {
    ...organizationHeaders,
    Authorization: `Bearer ${session.access_token}`,
  };
  if (json) headers["Content-Type"] = "application/json";
  return { organizationId, headers, userId: session.user.id };
}

async function authFetch<T>(
  path: string,
  init?: RequestInit,
  expectedContext?: { organizationId: string; userId: string },
): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const {
    organizationId,
    headers: auth,
    userId,
  } = await authHeaders(!isForm, init?.method ?? "GET");
  if (expectedContext) {
    if (
      expectedContext.organizationId !== organizationId ||
      expectedContext.userId !== userId
    ) {
      throw new Error(
        "Your account or organization changed. Reopen authenticator setup.",
      );
    }
  }
  const suppliedHeaders = Object.fromEntries(
    new Headers(init?.headers).entries(),
  );
  const headers = applyOrganizationContextHeader(
    { ...auth, ...suppliedHeaders },
    organizationId,
  );
  let resp: Response;
  try {
    resp = await sendMatrxRequest(
      buildMatrxRequestUrl(backendBase(), `/api/authenticator${path}`),
      { ...init, headers },
    );
  } catch {
    throw new Error(
      "Authenticator service unreachable — enrollment needs the backend online",
    );
  }
  // A non-2xx becomes the shared classified transport error (its message is the
  // server's user sentence); a 204 has no body.
  // Older authenticator servers send these two recent-auth refusals as plain
  // detail strings. Classify only their exact contract; other 401s stay errors.
  if (resp.status === 401) {
    const body: unknown = await resp
      .clone()
      .json()
      .catch(() => null);
    const detail =
      body && typeof body === "object" && "detail" in body ? body.detail : null;
    if (
      typeof detail === "string" &&
      (detail ===
        "recent authentication is required and the session's auth time (amr claim) could not be established — re-authenticate and retry" ||
        /^authentication within the last \d+s is required — re-authenticate and retry$/.test(
          detail,
        ))
    ) {
      throw new BackendApiError({
        code: "recent_auth_required",
        detail,
        userMessage:
          "Confirm your identity, then try saving the authenticator again.",
        status: 401,
      });
    }
  }
  if (resp.status === 204) return undefined as T;
  return readMatrxJsonResponse<T>(resp);
}

/** Every account the signed-in user holds an authenticator for. Metadata only. */
export async function fetchAuthenticators(): Promise<AuthenticatorEntry[]> {
  const resp = await authFetch<{ entries: AuthenticatorEntry[] }>("");
  return resp.entries ?? [];
}

/** Fetch the code the signed-in Vault owner needs to finish a provider login. */
export function fetchAuthenticatorCode(
  credentialItemId: string,
): Promise<AuthenticatorCode> {
  return authFetch<AuthenticatorCode>(
    `/${encodeURIComponent(credentialItemId)}/code`,
  );
}

/** Enroll from a setup key or a full otpauth:// URI.
 *
 *  Every route lands here: pasted key, pasted/dropped QR screenshot, and camera
 *  scan all decode to an otpauth URI **in the browser** (`lib/qr/decode.ts`), so
 *  a QR image never travels anywhere. The server's multipart `/enroll/qr` route
 *  still exists for clients without a local decoder; this one does not use it. */
export function enrollAuthenticator(
  credentialItemId: string,
  enrollmentInput: string,
  expectedContext?: { organizationId: string; userId: string },
): Promise<AuthenticatorEntry> {
  return authFetch<AuthenticatorEntry>(
    "/enroll",
    {
      method: "POST",
      body: JSON.stringify({
        credential_item_id: credentialItemId,
        enrollment_input: enrollmentInput,
      }),
    },
    expectedContext,
  );
}

/** Per-account consent toggle — effective on the next code generation. */
export function setAuthenticatorEnabled(
  credentialItemId: string,
  enabled: boolean,
): Promise<AuthenticatorEntry> {
  return authFetch<AuthenticatorEntry>(
    `/${encodeURIComponent(credentialItemId)}/enabled`,
    { method: "PUT", body: JSON.stringify({ enabled }) },
  );
}

/** Delete the seed. Generation stops immediately. Does NOT remove two-factor at
 *  the provider — the user's phone app / backup codes still work. */
export function deleteAuthenticator(credentialItemId: string): Promise<void> {
  return authFetch<void>(`/${encodeURIComponent(credentialItemId)}`, {
    method: "DELETE",
  });
}
