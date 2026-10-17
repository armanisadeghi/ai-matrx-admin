import type { GoogleContactsImportWindowDefinitionData } from "./googleContactsImportWindow.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, args, open }: LinkHydrateContext<GoogleContactsImportWindowDefinitionData>) {
    const initialExternalId = getRestorableResourceId(
      id,
      "googleContactsImportWindow",
    );
    const organizationId = args.o ?? null;
    dispatch(
      openOverlay({
        overlayId: "googleContactsImportWindow",
        data: { organizationId, initialExternalId },
      }),
    );
}
