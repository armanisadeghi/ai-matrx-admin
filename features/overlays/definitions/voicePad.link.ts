import type { VoicePadDefinitionData } from "./voicePad.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<VoicePadDefinitionData>) {
    dispatch(openOverlay({ overlayId: "voicePad", instanceId: id }));
}
