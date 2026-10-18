import type { AccessSetupWindowDefinitionData } from "./accessSetupWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<AccessSetupWindowDefinitionData>) {
    const [headType, subject] = id.split("~");
    const kind = subject?.slice(0, 2);
    const value = subject?.slice(2);
    if (!headType || !value || (kind !== "r-" && kind !== "c-")) return;
    dispatch(
      openOverlay({
        overlayId: "accessSetupWindow",
        data: kind === "c-" ? { headType, cycleId: value } : { headType, recordId: value },
      }),
    );
}
