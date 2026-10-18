import type { AiVoiceWindowDefinitionData } from "./aiVoiceWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<AiVoiceWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "aiVoiceWindow" }));
}
