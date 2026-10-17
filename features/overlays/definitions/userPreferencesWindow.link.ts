import type { UserPreferencesWindowDefinitionData } from "./userPreferencesWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<UserPreferencesWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "userPreferencesWindow" }));
}
