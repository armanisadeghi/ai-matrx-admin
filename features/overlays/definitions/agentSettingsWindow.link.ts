import type { AgentSettingsWindowDefinitionData } from "./agentSettingsWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<AgentSettingsWindowDefinitionData>) {
    dispatch(
      openOverlay({
        overlayId: "agentSettingsWindow",
        data: id && id !== "agentSettingsWindow" ? { initialAgentId: id } : {},
      }),
    );
}
