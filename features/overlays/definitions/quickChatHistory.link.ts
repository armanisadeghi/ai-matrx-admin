import { getRestorableResourceId } from "./link-helpers";
import type { QuickChatHistoryDefinitionData } from "./quickChatHistory.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<QuickChatHistoryDefinitionData>) {
    const selected = getRestorableResourceId(id, "quickChatHistory");
    dispatch(
      openOverlay({
        overlayId: "quickChatHistory",
        data: selected ? { initialSelectedConversationId: selected } : null,
      }),
    );
}
