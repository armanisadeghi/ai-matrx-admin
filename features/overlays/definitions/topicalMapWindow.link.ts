import { getRestorableResourceId } from "./link-helpers";
import type { TopicalMapWindowDefinitionData } from "./topicalMapWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, args, open }: LinkHydrateContext<TopicalMapWindowDefinitionData>) {
    const mapId = getRestorableResourceId(id, "picker") ?? "";
    const screen = args.s;
    dispatch(
      openOverlay({
        overlayId: "topicalMapWindow",
        instanceId: mapId || "picker",
        data: {
          mapId,
          screen:
            screen === "outline" ||
            screen === "table" ||
            screen === "graph" ||
            screen === "text" ||
            screen === "pages" ||
            screen === "history"
              ? screen
              : "outline",
          siteId: null,
        },
      }),
    );
}
