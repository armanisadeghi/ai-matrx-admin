import type { VoicePadAdvancedDefinitionData } from "./voicePadAdvanced.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<VoicePadAdvancedDefinitionData>) {
    dispatch(openOverlay({ overlayId: "voicePadAdvanced", instanceId: id }));
}
