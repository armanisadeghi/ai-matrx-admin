import type { DetailWindowDefinitionData } from "./detailWindow.overlay";
import { recordPeekOpenInput } from "@/features/window-panels/detail/canvas/recordPeek";
import { openDetailSingleton } from "@/features/window-panels/detail/openDetailSingleton";
import { dispatchThunk } from "@/lib/redux/hooks";
import { canvasActions } from "@ai-matrx/canvas";
import { parseDetailInstanceKey, presentationFromUrlArg, DETAIL_URL_AS_ARG, detailListFromUrlArgs } from "@ai-matrx/detail";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, args, open }: LinkHydrateContext<DetailWindowDefinitionData>) {
    const ref = parseDetailInstanceKey(id);
    if (!ref) {
      console.warn(
        `[UrlPanelManager] ?panels=detail:${id} names no record — expected detail:<type>.<id>.`,
      );
      return;
    }
    const presentation = presentationFromUrlArg(args[DETAIL_URL_AS_ARG]);
    // 🚨 NEW-15 — the list the record was opened from, when the token carries
    // it. `null` only when the link genuinely has none.
    const data = { type: ref.type, id: ref.id, seed: null, list: detailListFromUrlArgs(args) };
    if (presentation === "docked") {
      // The docked presentation is a canvas tab per record. The canvas state is
      // in this store, and an open that lands before the canvas has read its
      // memory survives the read, so the plain action is the whole open.
      dispatch(canvasActions.open(recordPeekOpenInput(data)));
      return;
    }
    // 🚨 D8 — THROUGH THE ONE PRIMITIVE, NEVER `openOverlay` DIRECTLY. A link
    // may name two records (`detail:file.B,detail:file.C`): this hydrator runs
    // once per token, the second call retargets the same singleton, and when it
    // dispatched the open itself the first record was closed in silence — the
    // exact defect the openers' announcement was written for (VERIFY-U-P1-R2).
    dispatchThunk(dispatch, openDetailSingleton({ data }));
}
