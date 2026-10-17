/**
 * Where a floating dock (`@ai-matrx/summon/dock`) remembers its position in this
 * browser — through the declared client-key family, so the key is registered,
 * prefixed and purged like every other piece of browser state.
 *
 * The family id is the one the retired `useDraggableFloat` used, so a position a
 * person already dragged a dock to survives the move to the package.
 */

import { parseDockPosition, type DockPositionStore } from "@ai-matrx/summon/dock";
import { defineClientKeyFamily } from "./client-storage";

const dockPositions = defineClientKeyFamily({
  id: "draggable-float.position",
  area: "local",
  kind: "ui-layout",
  reason: "Where a floating surface was dragged to on this screen; another screen has other edges.",
  legacyKey: (suffix) => suffix,
});

export const clientDockStore: DockPositionStore = {
  read: (id) => parseDockPosition(dockPositions.getJSON<unknown>(id)),
  write: (id, position) => {
    // Storage refused (private mode): the in-memory position still applies.
    if (position) dockPositions.setJSON(id, position);
    else dockPositions.remove(id);
  },
};
