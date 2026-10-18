import type { WelcomeFoundWindowDefinitionData } from "./welcomeFoundWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

/** `?panels=welcome-found` (the found-you notice's link): the signed-in person's own welcome, no id needed. */
export function hydrate({ dispatch }: LinkHydrateContext<WelcomeFoundWindowDefinitionData>) {
  dispatch(openOverlay({ overlayId: "welcomeFoundWindow" }));
}
