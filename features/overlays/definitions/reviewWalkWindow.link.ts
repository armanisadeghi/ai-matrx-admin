import type { ReviewWalkWindowDefinitionData } from "./reviewWalkWindow.overlay";
import { parseReviewWalkUrlId, REVIEW_WALK_URL_KEY, reviewWalkLabelsFromUrlArgs } from "@/features/review-walk/address";
import { openReviewWalk } from "@/features/review-walk/openReviewWalk";
import { dispatchThunk } from "@/lib/redux/hooks";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, args, open }: LinkHydrateContext<ReviewWalkWindowDefinitionData>) {
    const ref = parseReviewWalkUrlId(id);
    if (!ref) {
      console.warn(
        `[UrlPanelManager] ?panels=${REVIEW_WALK_URL_KEY}:${id} names no walkable unit — ` +
          `expected ${REVIEW_WALK_URL_KEY}:<assistant_message|agent_request|wf_node_outcome>.<unitId>.`,
      );
      return;
    }
    // Through the one primitive: an already-open walk on this unit is
    // focused, never overwritten (a restore carries the agent fields; a link
    // does not).
    dispatchThunk(
      dispatch,
      openReviewWalk({ ...ref, ...reviewWalkLabelsFromUrlArgs(args) }),
    );
}
