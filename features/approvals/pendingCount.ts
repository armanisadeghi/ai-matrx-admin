/**
 * The badge's two counts — loaded only when the idle-gated badge query first runs
 * (`./usePendingApprovalCount`). This module carries the whole kinds registry (the ONE predicate
 * needs each kind's `rendersRow` / `scopeRequirement`, not just its id) and the record store's
 * client; the header bell is on every page's first paint, so none of it may be static there.
 */

import { countPendingProposals } from "./data";
import { mountedApprovalKinds } from "./rendered";
import { APPROVAL_KINDS } from "./registry";
import type { ApprovalScope } from "./types";

export { countStoreApprovals } from "./store-door";

/** The `/approvals` mount's count for this person: its kinds AND its scope, the queue's filter. */
export function countBadgeProposals(userId: string, scope: ApprovalScope): Promise<number> {
  return countPendingProposals(userId, mountedApprovalKinds(APPROVAL_KINDS, scope), scope);
}
