import { getRestorableResourceId } from "./link-helpers";
import type { MessagesWindowDefinitionData } from "./messagesWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id: rawId, open }: LinkHydrateContext<MessagesWindowDefinitionData>) {
    const id = getRestorableResourceId(rawId, "messagesWindow");
    dispatch(
      openOverlay({
        overlayId: "messagesWindow",
        data: id ? { conversationId: id } : null,
      }),
    );
}
