import type { FilePreviewWindowDefinitionData } from "./filePreviewWindow.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id: rawId, args, open }: LinkHydrateContext<FilePreviewWindowDefinitionData>) {
    const id = getRestorableResourceId(rawId, "filePreviewWindow");
    const parsedPage = Number.parseInt(args.p ?? "", 10);
    const pageNumber = Number.isFinite(parsedPage)
      ? Math.max(1, parsedPage)
      : null;
    dispatch(
      openOverlay({
        overlayId: "filePreviewWindow",
        data: id
          ? {
              fileId: id,
              pageNumber,
              navigationRequestId: Date.now(),
            }
          : null,
      }),
    );
}
