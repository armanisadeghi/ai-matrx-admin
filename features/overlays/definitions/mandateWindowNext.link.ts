import { getRestorableResourceId } from "./link-helpers";
import type { MandateWindowNextDefinitionData } from "./mandateWindowNext.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, args, open }: LinkHydrateContext<MandateWindowNextDefinitionData>) {
    const initialMandateKey = getRestorableResourceId(
      id,
      "mandateWindowNext",
      "mandate-window-next",
    );
    dispatch(
      openOverlay({
        overlayId: "mandateWindowNext",
        data: { initialMandateKey, initialTab: args.t ?? null },
      }),
    );
}
