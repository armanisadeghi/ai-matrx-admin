// features/rich-document/actions/handlers/host-edit-bodies.ts
//
// This app's half of `edit`, `open-fullscreen-editor` (message-actions W1a) and `html-preview` (W2b). Both rows are
// @ai-matrx/chat's own; a CHAT message edits through the package's in-place editor. A note, a prompt
// result, an artifact or a structured chat payload opens THIS app's full-screen editor and saves
// through its source adapters (preparedEdit), registered here as the package's host body.

import { durableRecordId } from "@ai-matrx/kit/ids";
import { toast } from "@/lib/toast";
import { openOverlay } from "@ai-matrx/summon/open";
import { createFullScreenEditorCallbackGroup } from "@/features/overlays/definitions/callbacks/fullScreenEditor";
import { registerMessageActionHostBody } from "@ai-matrx/chat/agents/components/messages-display/rich-document/actions/host-bodies";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";
import { chatWriteBackBlocked, contentForDestination, getErrorMessage, serializeError } from "../utils";
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

// Publish HTML: the HTML preview & publishing overlay. Its save is source-agnostic via the source
// adapter (chat → editMessage, note → NotesAPI.update, …), routed through the callback registry
// (only the `callbackGroupId` string travels through Redux).
registerMessageActionHostBody("html-preview", async (ctx) => {
    const instanceId = ctx.instanceKey("html-preview");
    // A structured chat payload's JSON view must never be saved back as text.
    const canSave =
      Boolean(ctx.sourceAdapter.edit) &&
      !ctx.source.readOnly &&
      !(ctx.extensions?.type === "chat-message" && ctx.extensions.contentIsStructuredRaw);
    // Read-only: nothing is edited in place, so the page is purely outbound
    // and carries the envelope-free projection like every other destination.
    const prepared = canSave
      ? await prepareContentEdit(ctx)
      : { source: ctx.source, content: contentForDestination(ctx) };
    let preparedSource = prepared.source;
    // What the editor opened on — a display projection for chat — so the
    // adapter splices only the changed span into the stored text.
    let openedOn = prepared.content;

    // Save is source-agnostic via the source adapter (chat → editMessage,
    // note → NotesAPI.update, …). Route it through the callback registry so
    // it reaches the caller — htmlPreview is now callback-aware. A function
    // can't survive Redux; only the `callbackGroupId` string travels.
    const callbackGroupId = canSave
      ? createFullScreenEditorCallbackGroup({
          retainAfterSuccess: true,
          onSave: async (newContent: string) => {
            try {
              preparedSource = await savePreparedContentEdit({
                ctx,
                source: preparedSource,
                newContent,
                previousContent: openedOn,
              });
              openedOn = newContent;
            } catch (err) {
              preparedSource = acknowledgedPreparedSource(preparedSource, err, newContent) ?? preparedSource;
              console.error(
                "[html-preview] save failed",
                serializeError(err),
              );
              toast.error(getErrorMessage(err, "Failed to save"));
              throw err;
            }
          },
        }).callbackGroupId
      : null;

    ctx.dispatch(
      openOverlay({
        overlayId: "htmlPreview",
        instanceId,
        data: {
          content: prepared.content,
          // Publishing stores `source_message_id` (uuid): only a durable answer has one.
          messageId:
            preparedSource.type === "chat-message"
              ? (durableRecordId(preparedSource.messageId) ?? undefined)
              : undefined,
          conversationId:
            preparedSource.type === "chat-message"
              ? preparedSource.conversationId
              : undefined,
          callbackGroupId,
          title: "HTML Preview & Publishing",
          description:
            "Edit markdown, preview HTML, and publish your content",
          showSaveButton: canSave,
          isAgentSystem: preparedSource.type === "chat-message",
        },
      }),
    );
    ctx.onClose();
  });
