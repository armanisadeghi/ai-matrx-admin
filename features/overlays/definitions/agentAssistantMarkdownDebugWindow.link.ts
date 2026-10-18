import type { AgentAssistantMarkdownDebugWindowDefinitionData } from "./agentAssistantMarkdownDebugWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<AgentAssistantMarkdownDebugWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "agentAssistantMarkdownDebugWindow" }));
}
