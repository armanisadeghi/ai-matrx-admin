import { getRestorableResourceId } from "./link-helpers";
import type { MandateWindowDefinitionData } from "./mandateWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<MandateWindowDefinitionData>) {
    const initialMandateKey = getRestorableResourceId(
      id,
      "mandateWindow",
      "mandate-window",
    );
    dispatch(
      openOverlay({
        overlayId: "mandateWindow",
        data: initialMandateKey ? { initialMandateKey } : null,
      }),
    );
}
