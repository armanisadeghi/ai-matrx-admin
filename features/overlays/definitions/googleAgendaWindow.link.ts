import type { GoogleAgendaWindowDefinitionData } from "./googleAgendaWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<GoogleAgendaWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "googleAgendaWindow" }));
}
