import { safeRelativePath } from "@/utils/auth/safe-redirect";

export const HUGGING_FACE_OAUTH_COOKIE = "huggingface_oauth_session";

/** The round trip's browser half (GitHub's `github/oauth/session.ts` shape). */
export interface HuggingFaceOAuthSession {
  state: string;
  returnUrl: string;
  browserProof: string;
  organizationId: string;
}

export function parseHuggingFaceOAuthSession(value: string): HuggingFaceOAuthSession | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "state" in parsed &&
      "returnUrl" in parsed &&
      "browserProof" in parsed &&
      "organizationId" in parsed &&
      typeof parsed.state === "string" &&
      typeof parsed.returnUrl === "string" &&
      typeof parsed.browserProof === "string" &&
      typeof parsed.organizationId === "string" &&
      parsed.organizationId.length > 0
    ) {
      return {
        state: parsed.state,
        returnUrl: safeRelativePath(parsed.returnUrl, "/settings"),
        browserProof: parsed.browserProof,
        organizationId: parsed.organizationId,
      };
    }
  } catch {
    return null;
  }
  return null;
}
