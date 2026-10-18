import type { TranscriptionCleanupDefinitionData } from "./transcriptionCleanup.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<TranscriptionCleanupDefinitionData>) {
    dispatch(
      openOverlay({ overlayId: "transcriptionCleanup", instanceId: id }),
    );
}
