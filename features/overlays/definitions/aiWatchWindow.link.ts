import type { AiWatchWindowDefinitionData } from "./aiWatchWindow.overlay";
import { watchAiRunAction } from "@/features/overlays/definitions/aiWatchWindow.overlay";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<AiWatchWindowDefinitionData>) {
    const [kind, ...rest] = id.split("-");
    const value = rest.join("-");
    // The bare page window is AutoWatch's to open, on the page's first AI call: restoring it from the
    // address put an empty window over the page before any run (MKT-096).
    if (!value || !["c", "u", "w", "r"].includes(kind)) return;
    const key =
      kind === "c" ? "conversationId" : kind === "u" ? "userRequestId" : kind === "w" ? "workflowRunId" : "requestId";
    dispatch(watchAiRunAction({ [key]: value }));
}
