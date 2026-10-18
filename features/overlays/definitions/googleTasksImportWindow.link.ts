import type { GoogleTasksImportWindowDefinitionData } from "./googleTasksImportWindow.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, args, open }: LinkHydrateContext<GoogleTasksImportWindowDefinitionData>) {
    const projectId = getRestorableResourceId(id, "googleTasksImportWindow");
    const organizationId = args.o ?? null;
    dispatch(
      openOverlay({
        overlayId: "googleTasksImportWindow",
        data: { organizationId, projectId },
      }),
    );
}
