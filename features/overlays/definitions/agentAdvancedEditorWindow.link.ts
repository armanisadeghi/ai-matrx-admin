import type { AgentAdvancedEditorWindowDefinitionData } from "./agentAdvancedEditorWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<AgentAdvancedEditorWindowDefinitionData>) {
    dispatch(
      openOverlay({
        overlayId: "agentAdvancedEditorWindow",
        data:
          id && id !== "agentAdvancedEditorWindow"
            ? { initialAgentId: id }
            : {},
      }),
    );
}
