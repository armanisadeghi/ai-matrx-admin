// Pure pieces of the Security tab's sign-in history: the device label and the (time, id) paging cursor.
// Kept free of UI imports so they are unit-tested directly (signInPaging.test.ts).

/** "Chrome on Mac" from a user agent; the full string stays in the cell's tooltip. */
export function deviceOf(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /node|undici|python|curl|axios|okhttp|Go-http/i.test(ua)
              ? "Script"
              : null;
  const os = /iPhone|iPad|iOS/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? ua.slice(0, 40);
}

export const SIGN_IN_PAGE = 50;

export interface SignInEvent {
  id: string;
  signed_in_at: string;
  method: string | null;
  provider: string | null;
  aal: string | null;
  ip: string | null;
  user_agent: string | null;
  session_id: string | null;
  session_live: boolean;
  oauth_client: string | null;
  seeded: boolean;
}

export interface SignInPage {
  items: SignInEvent[];
  has_more: boolean;
}

/** Where the next page starts: the last row's (signed_in_at, id). Both travel together so rows sharing one instant never skip. */
export interface SignInCursor {
  before: string;
  beforeId: string;
}

export function cursorAfter(items: readonly SignInEvent[]): SignInCursor | null {
  const last = items[items.length - 1];
  return last ? { before: last.signed_in_at, beforeId: last.id } : null;
}

/** Appends a fetched page to what is shown, dropping any row already shown (a refresh can overlap). */
export function appendSignInPage(shown: SignInPage, next: SignInPage): SignInPage {
  const seen = new Set(shown.items.map((e) => e.id));
  return { items: [...shown.items, ...next.items.filter((e) => !seen.has(e.id))], has_more: next.has_more };
}
