import type { GoogleAgendaWindowDefinitionData } from "./googleAgendaWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<GoogleAgendaWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "googleAgendaWindow" }));
}
