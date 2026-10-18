import type { VoicePadDefinitionData } from "./voicePad.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<VoicePadDefinitionData>) {
    dispatch(openOverlay({ overlayId: "voicePad", instanceId: id }));
}
