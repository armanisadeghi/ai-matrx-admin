import { safeRelativePath } from "@/utils/auth/safe-redirect";

export const NOTION_OAUTH_COOKIE = "notion_oauth_session";

/** The round trip's browser half (GitHub's `github/oauth/session.ts` shape). */
export interface NotionOAuthSession {
  state: string;
  returnUrl: string;
  browserProof: string;
  organizationId: string;
}

export function parseNotionOAuthSession(value: string): NotionOAuthSession | null {
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

/**
 * The sentence aidream wrote for the person in a refusal. Its error envelope carries
 * `user_message` / `message`; FastAPI's own shape carries `detail`. Null when none is a string.
 */
export function refusalWords(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  for (const key of ["user_message", "message", "detail"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}
