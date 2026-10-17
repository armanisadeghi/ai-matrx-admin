import type { AiVoiceWindowDefinitionData } from "./aiVoiceWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<AiVoiceWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "aiVoiceWindow" }));
}
