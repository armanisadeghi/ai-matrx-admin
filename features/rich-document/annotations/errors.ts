// features/rich-document/annotations/errors.ts
//
// What a person reads when a sidecar write or read fails: a plain sentence
// saying what did not happen and what to do. The raw error (a Postgres code, a
// guard's developer message, a network failure) is logged once with
// console.error for the Error Inspector — it is never the sentence
// (verify-RC-B11 F4: "add it to the registry + upgrade @ai-matrx/associations"
// reached a person).

import { sessionStateNow } from "@/utils/supabase/sessionBarrier";

export class SidecarError extends Error {
  /**
   * Whether trying the same write again can succeed. False for a refusal the person cannot
   * change by retrying (a switched-off capability, a missing permission): the panel then
   * offers no Retry — a button that cannot work is a screen that lies.
   */
  readonly retryable: boolean;
  /** The request carried no identity (an ended or expired session): the remedy is signing in. */
  readonly signedOut: boolean;
  constructor(message: string, readonly raw?: unknown, retryable = true, signedOut = false) {
    super(message);
    this.name = "SidecarError";
    this.retryable = retryable;
    this.signedOut = signedOut;
  }
}

/** How every signed-out sentence starts, so a kept error string still says which remedy it needs. */
export const SIGNED_OUT_LEAD = "You're signed out";

export function isSignedOutSentence(text: string | null | undefined): boolean {
  return typeof text === "string" && text.startsWith(SIGNED_OUT_LEAD);
}

/**
 * True when the database refused the request because it carried NO identity — a long-lived tab
 * whose session ended or failed to refresh sends as `anon`. Measured on live 2026-10-17: a chat
 * tab 30 minutes old read `permission denied for function cmt_list` (42501), and the sentence said
 * "Ask the owner to share it", which no owner can fix. `authenticated` holds EXECUTE on every
 * comment door, so "permission denied for function" from one means the caller was anonymous; an
 * HTTP 401 says the same thing outright.
 */
export function isSignedOutRefusal(e: unknown): boolean {
  const code = codeOf(e);
  const status = e && typeof e === "object" ? (e as { status?: unknown }).status : undefined;
  if (code === "PGRST301" || code === "28000") return true;
  if (code !== "42501") return false;
  if (status === 401) return true;
  // A signed-in caller can also meet this text on a door it holds no EXECUTE on (a real grant gap,
  // HTTP 403): only a tab whose session is not attached reads it as signed out.
  return /permission denied for function/i.test(textOf(e)) && sessionStateNow() !== "attached";
}

/** The error a write raises when the record it belongs to is not known yet (nothing is sent). */
export function sourceNotReadyError(what: string): SidecarError {
  return new SidecarError(
    `This isn't ready for ${what} yet, so nothing was saved. Your text is kept — try again in a moment.`,
    undefined,
    true,
  );
}

/** The current text of a comment someone else changed while this person was editing it. */
export class EditConflictError extends SidecarError {
  constructor(readonly currentBody: string, readonly currentVersion: number | null) {
    super("Someone changed this comment while you were editing it.");
    this.name = "EditConflictError";
  }
}

function codeOf(e: unknown): string | undefined {
  if (!e || typeof e !== "object") return undefined;
  const c = (e as { code?: unknown }).code;
  // The associations package wraps a Postgres error as {code:"internal", detail:<pg error>}:
  // the database's own code is the one that says what happened.
  const inner = (e as { detail?: unknown }).detail;
  if (c === "internal" && inner && typeof inner === "object") {
    const ic = (inner as { code?: unknown }).code;
    if (typeof ic === "string" && ic) return ic;
  }
  return typeof c === "string" ? c : undefined;
}

/** "conversation" → "a conversation" in words, for sentences about a record kind. */
function kindWords(token: string): string {
  const w = token.replace(/_/g, " ");
  return /^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`;
}

function textOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e ?? "");
}

/** True when the failure is the connection, not the server answering (the write MAY have landed). */
export function isTransportFailure(e: unknown): boolean {
  const t = textOf(e).toLowerCase();
  const status = e && typeof e === "object" ? (e as { status?: unknown }).status : undefined;
  return (
    t.includes("failed to fetch") || t.includes("network") || t.includes("load failed") ||
    t.includes("timeout") || t.includes("timed out") || t.includes("aborted") ||
    (typeof status === "number" && status >= 500) || codeOf(e) === "" || /\b50[234]\b/.test(t)
  );
}

/**
 * `action` is what the person was doing, as a gerund phrase ("posting your comment").
 * Returns a SidecarError whose message is safe to show.
 */
export function humanError(action: string, e: unknown): SidecarError {
  if (e instanceof SidecarError) return e;
  console.error(`[annotations] ${action} failed`, e);
  const code = codeOf(e);
  const text = textOf(e);
  let sentence: string;
  let retryable = true;
  const unknownPair = /Unknown association type: (\S+) -> (\S+)/.exec(text);
  if (unknownPair) {
    // A pair nobody registered: trying again cannot work, so no Retry is offered.
    sentence = `Linking ${kindWords(unknownPair[1])} to ${kindWords(unknownPair[2])} isn't set up yet, so ${action} did not go through. Pick another kind of record, or ask an admin to allow this link.`;
    retryable = false;
  } else if (isSignedOutRefusal(e)) {
    // Before the permission branch: an anonymous request is a session to restore, not a share to ask for.
    return new SidecarError(`${SIGNED_OUT_LEAD}, so ${action} did not go through. Sign in again — your text is kept here.`, e, true, true);
  } else if (code === "42501" || /permission|not allowed|forbidden|cannot comment|may not/i.test(text)) {
    sentence = `You don't have permission for this here, so ${action} did not go through. Ask the owner to share it with you.`;
    retryable = false;
  } else if (code === "23514" || /invalid text_anchor|passage is invalid/i.test(text)) {
    sentence = `The text changed while you were working, so ${action} did not go through. Select the passage again and retry.`;
  } else if (/not a registered entity type|registered entity/i.test(text)) {
    sentence = `This kind of record can't take links or private notes in this version of the app yet, so ${action} did not go through. It will work after the next app update.`;
  } else if (code === "PT409" || /changed since you opened it/i.test(text)) {
    // A compare-and-swap refusal: someone saved first. Retrying the same write cannot work.
    sentence = `Someone changed this text after you opened it, so ${action} did not go through. Its newest version is reloading — try again on that.`;
    retryable = false;
  } else if (code === "PGRST202" || code === "42883") {
    sentence = `This part isn't switched on yet, so ${action} did not go through. Your text is kept here.`;
    retryable = false;
  } else if (isTransportFailure(e)) {
    sentence = `We couldn't reach the server while ${action}. It may or may not have been saved — Retry is safe and never makes a second copy.`;
  } else {
    // Unrecognised: NAME it by its code — "something went wrong" tells the person nothing and
    // tells whoever they report it to nothing either (Arman, 2026-09-25). The server's own words
    // stay out of the sentence (developer text, verify-RC-B11 F4); they are in the console
    // record above and in the error display's copy-for-AI.
    const status = e && typeof e === "object" ? (e as { status?: unknown }).status : undefined;
    const ref = code ? `error ${code}` : typeof status === "number" ? `HTTP ${status}` : e instanceof Error && e.name !== "Error" ? e.name : "";
    sentence = `${action} did not go through — the server refused it${ref ? ` (${ref})` : " without saying why"}. Retry, or reload the page if it keeps happening.`;
  }
  return new SidecarError(sentence[0].toUpperCase() + sentence.slice(1), e, retryable);
}
