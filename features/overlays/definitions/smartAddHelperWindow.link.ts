import type { SmartAddHelperWindowDefinitionData } from "./smartAddHelperWindow.overlay";
import { isHelperMethod } from "@/features/marketing/smart-add/helpers/types";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<SmartAddHelperWindowDefinitionData>) {
    if (!isHelperMethod(id)) return "refused";
    dispatch(openOverlay({ overlayId: "smartAddHelperWindow", instanceId: id, data: { method: id } }));
    return undefined;
}
