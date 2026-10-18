import { getRestorableUuid } from "./link-helpers";
import type { QuickDataWindowDefinitionData } from "./quickDataWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<QuickDataWindowDefinitionData>) {
    const tableId = getRestorableUuid(id, "quickDataWindow");
    dispatch(
      openOverlay({
        overlayId: "quickDataWindow",
        data: tableId ? { selectedTable: tableId } : null,
      }),
    );
}
