import type { VoicePadAdvancedDefinitionData } from "./voicePadAdvanced.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<VoicePadAdvancedDefinitionData>) {
    dispatch(openOverlay({ overlayId: "voicePadAdvanced", instanceId: id }));
}
