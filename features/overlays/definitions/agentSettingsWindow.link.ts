import type { AgentSettingsWindowDefinitionData } from "./agentSettingsWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<AgentSettingsWindowDefinitionData>) {
    dispatch(
      openOverlay({
        overlayId: "agentSettingsWindow",
        data: id && id !== "agentSettingsWindow" ? { initialAgentId: id } : {},
      }),
    );
}
