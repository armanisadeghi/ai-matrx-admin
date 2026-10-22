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

import "@/features/access-gate/accessEnv";

export {
  askForAccessBlind,
  BLIND_ASK_ANSWER,
  createAccessRequest,
  createDeleteRequest,
  createSettingAccessRequest,
  decideAccessRequest,
  decideSettingAccessRequest,
  getResourceActionRequestForDecision,
  getSettingAccessRequestForDecision,
  listAccessRequests,
  reportAccessRequest,
  withdrawAccessRequest,
} from "@ai-matrx/data/access";
export type {
  SettingAccessRequestCreated,
} from "@ai-matrx/data/access";
