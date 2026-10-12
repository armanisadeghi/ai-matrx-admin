// lib/organizations/organizationRefusal.ts
//
// The not-a-member refusal: recognition and the once-per-gap recheck are the
// package's (`isNotAMemberRefusal`, `createNotAMemberRefusalNotice`); this file
// binds the one notice instance the transports share. `recheck` is injected so
// this leaf imports no Redux.

import { isNotAMemberRefusal, createNotAMemberRefusalNotice } from "@ai-matrx/auth/organizations";

export { isNotAMemberRefusal };

let recheckNow: (() => void) | null = null;
const notice = createNotAMemberRefusalNotice(() => recheckNow?.());

/** True when a recheck was started (at most one per gap). */
export function noticeNotAMemberRefusal(
  body: unknown,
  recheck: () => void,
  now: number = Date.now(),
): boolean {
  recheckNow = recheck;
  return notice.notice(body, now);
}

/** Tests only. */
export function resetNotAMemberRefusalGap(): void {
  notice.reset();
}
