import type { AiWatchWindowDefinitionData } from "./aiWatchWindow.overlay";
import { watchAiRunAction } from "@/features/overlays/definitions/aiWatchWindow.overlay";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<AiWatchWindowDefinitionData>) {
    // `?panels=ai-watch:page` is the documented link to the page's one window (FEATURE.md · Entry points): a person who
    // follows it asked to see it, so it opens — with the page's own runs, or an honest "No AI calls on this page yet".
    // (It used to return here; the link then did nothing, silently — U9.) The window is never RESTORED on load
    // (`ephemeral`, watch-ai-never-restored.test.ts), so MKT-096's empty window over the page cannot come back from storage.
    if (id === "page") {
        dispatch(watchAiRunAction({}));
        return;
    }
    const [kind, ...rest] = id.split("-");
    const value = rest.join("-");
    if (!value || !["c", "u", "w", "r"].includes(kind)) return;
    const key =
      kind === "c" ? "conversationId" : kind === "u" ? "userRequestId" : kind === "w" ? "workflowRunId" : "requestId";
    dispatch(watchAiRunAction({ [key]: value }));
}
