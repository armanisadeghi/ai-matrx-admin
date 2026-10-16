// features/rich-document/actions/handlers/save.ts
//
// Save / capture actions: Scratch, Notes, Code Scratch, Code, File, Task.
// All source-agnostic. The `save-to-task` action used to be chat-only
// because it hard-coded `entity_type: "cx_message"`; we generalize via
// a source → entity_type map so any source can produce a task.

import { durableRecordId } from "@ai-matrx/kit/ids";
import { FileCode, CheckSquare } from "lucide-react";
import { toast } from "@/lib/toast";
import { CodeFilesAPI } from "@/features/code-files/service/codeFilesApi";
import { setPendingSource } from "@/features/tasks/redux/taskUiSlice";
import { registerActionIfAbsent } from "./register-if-absent";
import { extractFirstCodeBlock, getErrorMessage, requireAuth, buildTaskTitle, contentForDestination, chatStateOf } from "../utils";
import { selectConversationTitle } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversations.selectors";
import { selectMessagePosition } from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { buildTaskSeedFromMessage } from "@ai-matrx/chat/agents/components/messages-display/message-options/buildTaskSeedFromMessage";
import type { ContentSource } from "@ai-matrx/rich-content/rich-document/types";

/**
 * Map a ContentSource to the `entity_type` used by save-to-task. Centralized
 * so adding a new source means one change here rather than hunting through
 * handlers. Returns null when the source has no natural entity link
 * (raw content gets no parent association).
 */
function sourceToEntityType(source: ContentSource): {
  entity_type: string;
  entity_id: string;
  parent?: { entity_type: string; entity_id: string };
} | null {
  switch (source.type) {
    case "chat-message": {
      // A client-temp answer has no row to link; the task gets no parent link
      // rather than an association write that 22P02s.
      const messageId = durableRecordId(source.messageId);
      if (!messageId) return null;
      return {
        entity_type: "message",
        entity_id: messageId,
        parent: {
          entity_type: "conversation",
          entity_id: source.conversationId,
        },
      };
    }
    case "note":
      return { entity_type: "note", entity_id: source.noteId };
    case "artifact":
      return { entity_type: "artifact", entity_id: source.artifactId };
    case "working-document":
      // Link to the durable backing row when one exists; otherwise hang the
      // task off the conversation so it still has a home.
      return source.documentId
        ? {
            entity_type: "document",
            entity_id: source.documentId,
            parent: {
              entity_type: "conversation",
              entity_id: source.conversationId,
            },
          }
        : {
            entity_type: "conversation",
            entity_id: source.conversationId,
          };
    // No association edge: these sources have no registered entity row.
    // `prompt-result` (prompt system retired), `scraper-result` (no registered
    // scraper-run entity) and `raw` content become standalone tasks. Inventing a
    // phantom token here would FK-violate platform.associations — never do it.
    case "prompt-result":
    case "scraper-result":
    case "raw":
      return null;
  }
}

registerActionIfAbsent({
  id: "save-code-to-scratch",
  label: "Save code to Scratch",
  icon: FileCode,
  iconColor: "text-amber-500 dark:text-amber-400",
  category: "save",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 2,
  visible: (ctx) => {
    // Only show when the content actually has a code block. Saves users
    // from clicking a save-code action on plain prose and getting an error.
    const { code, found } = extractFirstCodeBlock(ctx.content);
    return found && code.trim().length > 0 && code !== ctx.content;
  },
  run: async (ctx) => {
    if (
      !requireAuth(
        ctx,
        "save-code-to-scratch",
        "Save code to Scratch",
        "Sign in to save code snippets to your code files.",
      )
    )
      return;
    const { code, language, found } = extractFirstCodeBlock(ctx.content);
    if (!found || !code.trim()) {
      toast.error("No code to save");
      return;
    }
    try {
      await CodeFilesAPI.create({
        name: `snippet-${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:T]/g, "-")}.${
          language === "typescript"
            ? "ts"
            : language === "javascript"
              ? "js"
              : language === "python"
                ? "py"
                : "txt"
        }`,
        language: language ?? "plaintext",
        content: code,
        tags: [],
      });
      toast.success("Saved code to Scratch!");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save code"));
    }
  },
});

registerActionIfAbsent({
  id: "save-to-task",
  label: "Create Task",
  icon: CheckSquare,
  iconColor: "text-blue-500 dark:text-blue-400",
  category: "save",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 5,
  run: (ctx) => {
    if (
      !requireAuth(
        ctx,
        "save-to-task",
        "Create task",
        "Sign in to create and track tasks from your content.",
      )
    )
      return;
    // A chat message seeds through the ONE message→task builder (conversation
    // label as the title, cleaned previews as association labels).
    if (ctx.source.type === "chat-message") {
      const { conversationId, messageId } = ctx.source;
      const state = chatStateOf(ctx, ["conversations", "messages"]);
      ctx.dispatch(
        setPendingSource(
          buildTaskSeedFromMessage({
            content: contentForDestination(ctx),
            messageId: messageId || null,
            conversationId: conversationId || null,
            conversationTitle: conversationId && state
              ? selectConversationTitle(conversationId)(state)
              : null,
            messagePosition:
              conversationId && messageId && state
                ? selectMessagePosition(conversationId, messageId)(state)
                : undefined,
            metadata: ctx.metadata,
          }),
        ),
      );
      ctx.onClose();
      return;
    }
    const readable = contentForDestination(ctx);
    const preview = readable.slice(0, 400);
    const seedTitle = buildTaskTitle(readable);
    const entityLink = sourceToEntityType(ctx.source);

    ctx.dispatch(
      setPendingSource({
        // No entityLink → no association (standalone task). Never a phantom token.
        entity_type: entityLink?.entity_type ?? null,
        entity_id: entityLink?.entity_id ?? null,
        label: preview,
        metadata: {
          ...(entityLink?.parent
            ? { parent: { ...entityLink.parent, label: preview.slice(0, 120) } }
            : {}),
          ...(ctx.metadata ?? {}),
        },
        prePopulate: {
          title: seedTitle,
          description: readable,
        },
      }),
    );
  },
});
