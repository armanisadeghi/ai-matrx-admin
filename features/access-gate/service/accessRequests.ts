/**
 * accessRequests — file, answer, and withdraw a request for access.
 *
 * Delivery deliberately lives HERE rather than in the database: filing the row
 * is one RPC, and telling the humans about it reuses the platform's existing
 * "system notifies a user" primitive (`sendDirectActionMessage`), which already
 * renders action chips inside the DM the recipient is already reading. There is
 * no second notification system, no second inbox, and no email hop.
 *
 * A delivery failure never fails the request. The row is the durable fact; the
 * DM is how it gets noticed. Losing the notification means the owner sees it in
 * their access-requests inbox instead — losing the row would mean the ask
 * simply vanished.
 */
//
// The implementation is `@ai-matrx/data/access` (one copy for every app); this file only makes sure
// the app's client and sender are injected before it runs.

import * as access from "@ai-matrx/data/access";
import { ensureAccessEnv } from "@/features/access-gate/accessEnv";

export const askForAccessBlind: typeof access.askForAccessBlind = (
  ...args: Parameters<typeof access.askForAccessBlind>
) => {
  ensureAccessEnv();
  return access.askForAccessBlind(...args);
};
export const createAccessRequest: typeof access.createAccessRequest = (
  ...args: Parameters<typeof access.createAccessRequest>
) => {
  ensureAccessEnv();
  return access.createAccessRequest(...args);
};
export const createDeleteRequest: typeof access.createDeleteRequest = (
  ...args: Parameters<typeof access.createDeleteRequest>
) => {
  ensureAccessEnv();
  return access.createDeleteRequest(...args);
};
export const createSettingAccessRequest: typeof access.createSettingAccessRequest =
  (...args: Parameters<typeof access.createSettingAccessRequest>) => {
    ensureAccessEnv();
    return access.createSettingAccessRequest(...args);
  };
export const decideAccessRequest: typeof access.decideAccessRequest = (
  ...args: Parameters<typeof access.decideAccessRequest>
) => {
  ensureAccessEnv();
  return access.decideAccessRequest(...args);
};
export const decideSettingAccessRequest: typeof access.decideSettingAccessRequest =
  (...args: Parameters<typeof access.decideSettingAccessRequest>) => {
    ensureAccessEnv();
    return access.decideSettingAccessRequest(...args);
  };
export const getResourceActionRequestForDecision: typeof access.getResourceActionRequestForDecision =
  (...args: Parameters<typeof access.getResourceActionRequestForDecision>) => {
    ensureAccessEnv();
    return access.getResourceActionRequestForDecision(...args);
  };
export const getSettingAccessRequestForDecision: typeof access.getSettingAccessRequestForDecision =
  (...args: Parameters<typeof access.getSettingAccessRequestForDecision>) => {
    ensureAccessEnv();
    return access.getSettingAccessRequestForDecision(...args);
  };
export const listAccessRequests: typeof access.listAccessRequests = (
  ...args: Parameters<typeof access.listAccessRequests>
) => {
  ensureAccessEnv();
  return access.listAccessRequests(...args);
};
export const reportAccessRequest: typeof access.reportAccessRequest = (
  ...args: Parameters<typeof access.reportAccessRequest>
) => {
  ensureAccessEnv();
  return access.reportAccessRequest(...args);
};
export const withdrawAccessRequest: typeof access.withdrawAccessRequest = (
  ...args: Parameters<typeof access.withdrawAccessRequest>
) => {
  ensureAccessEnv();
  return access.withdrawAccessRequest(...args);
};

export { BLIND_ASK_ANSWER } from "@ai-matrx/data/access";
export type { SettingAccessRequestCreated } from "@ai-matrx/data/access";
