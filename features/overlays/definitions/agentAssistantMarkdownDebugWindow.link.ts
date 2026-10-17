import type { AgentAssistantMarkdownDebugWindowDefinitionData } from "./agentAssistantMarkdownDebugWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<AgentAssistantMarkdownDebugWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "agentAssistantMarkdownDebugWindow" }));
}
