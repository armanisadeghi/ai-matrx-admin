// features/rich-document/actions/handlers/host-edit-bodies.ts
//
// This app's half of `edit` and `open-fullscreen-editor` (message-actions W1a). Both rows are
// @ai-matrx/chat's own; a CHAT message edits through the package's in-place editor. A note, a prompt
// result, an artifact or a structured chat payload opens THIS app's full-screen editor and saves
// through its source adapters (preparedEdit), registered here as the package's host body.

import { toast } from "@/lib/toast";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { createFullScreenEditorCallbackGroup } from "@/features/overlays/callbacks/fullScreenEditor";
import { registerMessageActionHostBody } from "@ai-matrx/chat/agents/components/messages-display/rich-document/actions/host-bodies";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";
import { chatWriteBackBlocked, getErrorMessage, serializeError } from "../utils";
import { acknowledgedPreparedSource, prepareContentEdit, savePreparedContentEdit } from "./preparedEdit";

/**
 * Open the full-screen editor on the prepared content. Save is source-agnostic via
 * `ctx.sourceAdapter.edit`, routed through the callback registry (a function never travels
 * through Redux). Read-only when the source cannot save.
 */
async function openFullScreenEditor(
  ctx: RichDocumentActionContext,
  options: { canSave: boolean; instance: string; initialTab: string; title?: string; analysis: boolean; logTag: string },
): Promise<void> {
  const prepared = options.canSave ? await prepareContentEdit(ctx) : { source: ctx.source, content: ctx.content };
  let preparedSource = prepared.source;
  // What the editor opened on, so the adapter splices only the changed span.
  let openedOn = prepared.content;
  const callbackGroupId = options.canSave
    ? createFullScreenEditorCallbackGroup({
        onSave: async (newContent: string) => {
          try {
            preparedSource = await savePreparedContentEdit({ ctx, source: preparedSource, newContent, previousContent: openedOn });
            openedOn = newContent;
            toast.success("Changes saved");
          } catch (err) {
            preparedSource = acknowledgedPreparedSource(preparedSource, err, newContent) ?? preparedSource;
            console.error(`[${options.logTag}] save failed`, JSON.stringify(serializeError(err), null, 2));
            toast.error(getErrorMessage(err, "Failed to save changes"));
            throw err;
          }
        },
      }).callbackGroupId
    : null;
  ctx.dispatch(
    openOverlay({
      overlayId: "fullScreenEditor",
      instanceId: ctx.instanceKey(options.instance),
      data: {
        content: prepared.content,
        mode: "free",
        callbackGroupId,
        messageId: preparedSource.type === "chat-message" ? preparedSource.messageId : undefined,
        noteId: preparedSource.type === "note" ? preparedSource.noteId : undefined,
        tabs: ["write", "matrx_split", "markdown", "wysiwyg", "preview", ...(options.analysis ? ["analysis"] : [])],
        initialTab: options.initialTab,
        analysisData: ctx.metadata as Record<string, unknown> | undefined,
        title: options.title,
        showSaveButton: options.canSave,
        showCopyButton: true,
      },
    }),
  );
}

registerMessageActionHostBody("edit", (ctx) =>
  openFullScreenEditor(ctx, { canSave: true, instance: "edit-content", initialTab: "matrx_split", analysis: false, logTag: "edit" }),
);

registerMessageActionHostBody("open-fullscreen-editor", (ctx) =>
  openFullScreenEditor(ctx, {
    // Nothing here writes a chat message: a chat payload opens read-only.
    canSave:
      Boolean(ctx.sourceAdapter.edit) && ctx.source.type !== "chat-message" && !chatWriteBackBlocked(ctx) && !ctx.source.readOnly,
    instance: "fullscreen-editor",
    initialTab: "preview",
    title: "Full-screen Editor",
    analysis: true,
    logTag: "open-fullscreen-editor",
  }),
);
