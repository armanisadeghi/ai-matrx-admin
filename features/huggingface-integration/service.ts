import { del as deleteJson, getJson, postJson } from "@/lib/python-client";
import { startOAuthPopup } from "@/utils/oauth-popup";

/**
 * The person's own Hugging Face account, as aidream reports it
 * (`/hugging-face/connection`). Never carries a token: the token lives in the
 * Vault and is read server-side only.
 */
export interface HuggingFaceConnection {
  connected: boolean;
  connection_id: string | null;
  account_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  method: "oauth" | "pasted_token" | null;
  status: string;
  /** False until the AI Matrx Hugging Face OAuth app is registered. */
  oauth_available?: boolean | null;
}

export const HUGGING_FACE_TOKENS_URL = "https://huggingface.co/settings/tokens";
export const HUGGING_FACE_ICON_URL = "https://huggingface.co/favicon.ico";

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

export async function loadHuggingFaceConnection(): Promise<HuggingFaceConnection> {
  try {
    return (await getJson<HuggingFaceConnection>("/api/hugging-face/connection")).data;
  } catch (cause) {
    throw new Error(message(cause, "Could not load your Hugging Face connection."));
  }
}

/** Checked by Hugging Face before anything is saved; a refused token throws its plain-words reason. */
export async function saveHuggingFaceToken(token: string): Promise<HuggingFaceConnection> {
  try {
    return (
      await postJson<HuggingFaceConnection, { token: string }>("/api/hugging-face/connection/token", {
        token: token.trim(),
      })
    ).data;
  } catch (cause) {
    throw new Error(message(cause, "Hugging Face did not accept that token."));
  }
}

export async function disconnectHuggingFace(): Promise<HuggingFaceConnection> {
  try {
    const { data } = await deleteJson<HuggingFaceConnection>("/api/hugging-face/connection");
    if (!data) throw new Error("Hugging Face did not confirm the disconnect.");
    return data;
  } catch (cause) {
    throw new Error(message(cause, "Could not disconnect Hugging Face."));
  }
}

export function huggingFaceConnectUrl(returnUrl: string, organizationId: string): string {
  const params = new URLSearchParams({ return_url: returnUrl, organization_id: organizationId });
  return `/api/hugging-face/oauth/start?${params.toString()}`;
}

export function startHuggingFaceSignIn(
  returnUrl: string,
  organizationId: string,
): Promise<{ ok: true; value: "connected" } | { ok: false; error: string; cancelled: boolean }> {
  return startOAuthPopup({
    url: huggingFaceConnectUrl(returnUrl, organizationId),
    target: "huggingface_oauth",
    successType: "huggingface_oauth_complete",
    errorType: "huggingface_oauth_error",
    readSuccessValue: () => "connected" as const,
  });
}
