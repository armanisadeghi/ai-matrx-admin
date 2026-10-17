import type { DataChangesWindowDefinitionData } from "./dataChangesWindow.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<DataChangesWindowDefinitionData>) {
    const tableId = getRestorableResourceId(id, "dataChangesWindow");
    if (!tableId) {
      console.warn(`[UrlPanelManager] ?panels=data_changes:${id} names no table — expected data_changes:<tableId>.`);
      return;
    }
    dispatch(openOverlay({ overlayId: "dataChangesWindow", data: { tableId, organizationId: null } }));
}
