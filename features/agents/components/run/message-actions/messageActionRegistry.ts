/**
 * messageActionRegistry — menu item factories for message action menus.
 *
 * Two entry points:
 *   - `getAssistantMessageActions(ctx)` — items for assistant-authored messages
 *     (edit content, fork, copy, export, save, etc.)
 *   - `getUserMessageActions(ctx)` — items for user-authored messages
 *     (edit & resubmit, fork at this question, copy, export, save, delete)
 *
 * Actions that mutate the conversation (edit, fork, delete) dispatch the
 * DB-faithful CRUD thunks from `features/agents/redux/execution-system/message-crud`
 * and round-trip through Supabase. Actions that don't touch the conversation
 * (copy, audio, export, notes, TTS) execute directly.
 *
 * Every action requires both `conversationId` and `messageId` (the server
 * `cx_message.id`). Items that can't run without those ids hide themselves.
 */

import {
  BookText,
  Briefcase,
  Copy,
  FileCode,
  FileText,
  Eye,
  Globe,
  Brain,
  Save,
  Edit,
  CheckSquare,
  Mail,
  Printer,
  ScanLine,
  Bug,
  Megaphone,
  Settings,
  GitBranch,
  Send,
  FileType,
} from "lucide-react";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { printMarkdownContent } from "@/features/conversation/utils/markdown-print";
import { loadWordPressCSS } from "@/features/html-pages/css/wordpress-styles";
import { NotesAPI } from "@/features/notes";
import {
  createTaskWithAssociation,
  setSelectedTaskId,
  setPendingSource,
} from "@/features/tasks/redux";
import { toast } from "sonner";
import {
  openOverlay,
  closeOverlay,
  openFullScreenEditor,
  openHtmlPreview,
  openSaveToNotes,
  openEmailDialog,
  openAuthGate,
  openFeedbackDialog,
  openAnnouncements,
  openUserPreferences,
} from "@/lib/redux/slices/overlaySlice";
import type { MenuItem } from "@/components/official/AdvancedMenu";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import type { Json } from "@/types/database.types";

const PENDING_ACTION_KEY = "matrx_pending_post_auth_action";

// ============================================================================
// CONTEXT
// ============================================================================

export interface MessageActionContext {
  /** Flat-text rendering of the message (for copy/print/email). */
  content: string;
  /** Is the viewer signed in? Gates auth-required actions. */
  isAuthenticated: boolean;
  /** Server `cx_message.id`. Required for any mutation path; null hides those items. */
  messageId: string | null;
  /** Server `cx_conversation.id`. Required for any mutation path; null hides those items. */
  conversationId: string | null;
  /** `cx_message.metadata` — arbitrary JSON; included in saves and exports. */
  metadata: Record<string, unknown> | null;
  dispatch: AppDispatch;
  onClose: () => void;

  /** True when the renderer has a full-page print handler ready. */
  showFullPrint: boolean;
  onFullPrint?: () => void;
  isCapturing?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "string") return error || fallback;
  if (error && typeof error === "object") {
    // `createAsyncThunk`'s `rejectWithValue({ message })` surfaces the
    // payload as-is on `.unwrap()` rejection; Supabase `PostgrestError`
    // also lives on error objects with non-enumerable keys.
    const e = error as Record<string, unknown>;
    const msg =
      (typeof e.message === "string" && e.message) ||
      (typeof e.details === "string" && e.details) ||
      (typeof e.hint === "string" && e.hint) ||
      null;
    if (msg) return msg;
  }
  return fallback;
}

/**
 * Serialize any thrown value into a log-friendly object. Supabase errors
 * and thunk `rejectWithValue` payloads are often class instances with
 * non-enumerable fields that default to `{}` on `JSON.stringify`, which
 * hides the actual failure.
 */
function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    return {
      code: e.code ?? null,
      message: e.message ?? null,
      details: e.details ?? null,
      hint: e.hint ?? null,
      status: e.status ?? null,
      name: e.name ?? null,
    };
  }
  return { raw: String(error) };
}

function requireAuth(
  ctx: MessageActionContext,
  actionKey: string,
  featureName: string,
  description: string,
): boolean {
  if (!ctx.isAuthenticated) {
    try {
      sessionStorage.setItem(
        PENDING_ACTION_KEY,
        JSON.stringify({ action: actionKey, savedContent: ctx.content }),
      );
    } catch {
      /* ignore */
    }
    ctx.dispatch(
      openAuthGate({ featureName, featureDescription: description }),
    );
    return false;
  }
  return true;
}

function wrapTextAsContent(text: string): Json {
  return [{ type: "text", text }] as unknown as Json;
}

// ============================================================================
// SHARED ITEMS — apply to both user and assistant messages
// ============================================================================

function copyItems(ctx: MessageActionContext): MenuItem[] {
  const { content } = ctx;
  return [
    {
      key: "copy-plain",
      icon: Copy,
      iconColor: "text-blue-500 dark:text-blue-400",
      label: "Copy text",
      action: async () => {
        await copyToClipboard(content, {
          onSuccess: () => {},
          onError: (error) => {
            throw new Error(getErrorMessage(error, "Failed to copy text"));
          },
        });
      },
      category: "Copy",
      successMessage: "Copied",
      errorMessage: "Failed to copy",
    },
    {
      key: "copy-docs",
      icon: FileText,
      iconColor: "text-green-500 dark:text-green-400",
      label: "Copy for Google Docs",
      action: async () => {
        await copyToClipboard(content, {
          isMarkdown: true,
          formatForGoogleDocs: true,
          onSuccess: () => {},
          onError: (error) => {
            throw new Error(getErrorMessage(error, "Failed to copy for Docs"));
          },
        });
      },
      category: "Copy",
      successMessage: "Formatted for Google Docs",
      errorMessage: "Failed to copy",
    },
    {
      key: "copy-word",
      icon: FileType,
      iconColor: "text-blue-600 dark:text-blue-400",
      label: "Copy for Word",
      action: async () => {
        await copyToClipboard(content, {
          isMarkdown: true,
          formatForGoogleDocs: true,
          onSuccess: () => {},
          onError: (error) => {
            throw new Error(getErrorMessage(error, "Failed to copy for Word"));
          },
        });
      },
      category: "Copy",
      successMessage: "Formatted for Microsoft Word",
      errorMessage: "Failed to copy",
    },
  ];
}

function exportItems(ctx: MessageActionContext): MenuItem[] {
  const {
    content,
    conversationId,
    messageId,
    metadata,
    isAuthenticated,
    dispatch,
    onClose,
    showFullPrint,
    onFullPrint,
    isCapturing,
  } = ctx;

  const items: MenuItem[] = [
    {
      key: "html-preview",
      icon: Eye,
      iconColor: "text-indigo-500 dark:text-indigo-400",
      label: "HTML preview",
      action: () => {
        const instanceId = `html-preview-${messageId ?? "default"}`;
        dispatch(
          openHtmlPreview({
            content,
            messageId: messageId ?? undefined,
            conversationId: conversationId ?? undefined,
            instanceId,
            showSaveButton: Boolean(conversationId && messageId),
            isAgentSystem: true,
            onSave: async (newContent: string) => {
              if (conversationId && messageId) {
                try {
                  const { editMessage } =
                    await import("@/features/agents/redux/execution-system/message-crud");
                  await dispatch(
                    editMessage({
                      conversationId,
                      messageId,
                      newContent: wrapTextAsContent(newContent),
                    }),
                  ).unwrap();
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error("[html-preview] save failed", err);
                }
              }
              dispatch(closeOverlay({ overlayId: "htmlPreview", instanceId }));
            },
          }),
        );
        onClose();
      },
      category: "Export",
      showToast: false,
    },
    {
      key: "copy-html",
      icon: Globe,
      iconColor: "text-orange-500 dark:text-orange-400",
      label: "Copy HTML page",
      action: async () => {
        await copyToClipboard(content, {
          isMarkdown: true,
          formatForWordPress: true,
          showHtmlPreview: true,
          onShowHtmlPreview: async (filteredHtml) => {
            const cssContent = await loadWordPressCSS();
            const html = `<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Content</title><style>${cssContent}</style></head><body>${filteredHtml}</body></html>`;
            await copyToClipboard(html, {
              onSuccess: () => {},
              onError: () => {},
            });
          },
          onSuccess: () => {},
          onError: (error) => {
            throw new Error(getErrorMessage(error, "Failed to copy HTML"));
          },
        });
      },
      category: "Export",
      successMessage: "HTML page copied",
      errorMessage: "Failed to copy HTML",
    },
    {
      key: "email-to-me",
      icon: Mail,
      iconColor: "text-sky-500 dark:text-sky-400",
      label: "Email to me",
      action: async () => {
        if (!isAuthenticated) {
          dispatch(
            openEmailDialog({
              content,
              metadata,
            }),
          );
          return;
        }
        const response = await fetch("/api/chat/email-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            metadata: { ...metadata, timestamp: new Date().toLocaleString() },
          }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.msg || "Failed to send email");
        onClose();
      },
      category: "Export",
      successMessage: "Email sent!",
      errorMessage: "Failed to send email",
    },
    {
      key: "print",
      icon: Printer,
      iconColor: "text-slate-500 dark:text-slate-400",
      label: "Print / Save PDF",
      action: () => {
        printMarkdownContent(content, "Message");
        onClose();
      },
      category: "Export",
      showToast: false,
    },
  ];

  if (showFullPrint && onFullPrint) {
    items.push({
      key: "full-print",
      icon: ScanLine,
      iconColor: "text-slate-600 dark:text-slate-300",
      label: isCapturing ? "Generating PDF…" : "Full Print (all blocks)",
      action: () => {
        if (!isCapturing) {
          onFullPrint();
          onClose();
        }
      },
      disabled: isCapturing,
      category: "Export",
      showToast: false,
    });
  }

  return items;
}

function saveItems(ctx: MessageActionContext): MenuItem[] {
  const { content, dispatch, onClose } = ctx;
  return [
    {
      key: "save-scratch",
      icon: FileText,
      iconColor: "text-cyan-500 dark:text-cyan-400",
      label: "Save to Scratch",
      action: async () => {
        if (
          !requireAuth(
            ctx,
            "save-scratch",
            "Save to Scratch",
            "Sign in to save notes to your Scratch folder.",
          )
        )
          return;
        await NotesAPI.create({
          label: "New Note",
          content,
          folder_name: "Scratch",
          tags: [],
        });
      },
      category: "Actions",
      successMessage: "Saved to Scratch!",
      errorMessage: "Failed to save",
    },
    {
      key: "save-notes",
      icon: Save,
      iconColor: "text-violet-500 dark:text-violet-400",
      label: "Save to Notes",
      action: () => {
        if (
          !requireAuth(
            ctx,
            "save-notes",
            "Save to Notes",
            "Sign in to save notes and organize your messages.",
          )
        )
          return;
        dispatch(openSaveToNotes({ content }));
      },
      category: "Actions",
      showToast: false,
    },
    {
      key: "save-file",
      icon: FileCode,
      iconColor: "text-rose-500 dark:text-rose-400",
      label: "Save as file",
      action: () => {
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const blob = new Blob([content], {
          type: "text/markdown;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `message-${ts}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onClose();
      },
      category: "Actions",
      successMessage: "File saved!",
      errorMessage: "Failed to save file",
    },
    {
      key: "add-to-tasks",
      icon: CheckSquare,
      iconColor: "text-blue-500 dark:text-blue-400",
      label: "Create task from message",
      action: () => {
        if (
          !requireAuth(
            ctx,
            "add-to-tasks",
            "Create task",
            "Sign in to create and track tasks from your messages.",
          )
        )
          return;
        const preview = content.slice(0, 400);
        // Seed a sensible title from the first line, but let the user edit
        // it in the dialog — this is the UX fix the user asked for.
        const seedTitle =
          content
            .trim()
            .split(/\n+/)[0]
            ?.replace(/^[#>*\-\s]+/, "")
            .slice(0, 100) || "";

        dispatch(
          setPendingSource({
            entity_type: "cx_message",
            entity_id: ctx.messageId ?? "",
            label: preview,
            metadata: {
              // Also attach the whole conversation when available so the
              // resulting task is reachable from either side.
              ...(ctx.conversationId
                ? {
                    parent: {
                      entity_type: "cx_conversation",
                      entity_id: ctx.conversationId,
                      label: preview.slice(0, 120),
                    },
                  }
                : {}),
              ...(ctx.metadata ?? {}),
            },
            prePopulate: {
              title: seedTitle,
              description: content,
            },
          }),
        );
        onClose();
      },
      category: "Actions",
      showToast: false,
    },
  ];
}

function appItems(ctx: MessageActionContext): MenuItem[] {
  const { dispatch, onClose } = ctx;
  return [
    {
      key: "submit-feedback",
      icon: Bug,
      iconColor: "text-orange-500 dark:text-orange-400",
      label: "Submit feedback",
      action: () => {
        dispatch(openFeedbackDialog());
        onClose();
      },
      category: "App",
      showToast: false,
    },
    {
      key: "announcements",
      icon: Megaphone,
      iconColor: "text-purple-500 dark:text-purple-400",
      label: "Announcements",
      action: () => {
        dispatch(openAnnouncements());
        onClose();
      },
      category: "App",
      showToast: false,
    },
    {
      key: "user-preferences",
      icon: Settings,
      iconColor: "text-slate-500 dark:text-slate-400",
      label: "Preferences",
      action: () => {
        dispatch(openUserPreferences());
        onClose();
      },
      category: "App",
      showToast: false,
    },
  ];
}

// ============================================================================
// EDIT-PATH ITEMS — differ by role
// ============================================================================

/**
 * Edit the message in-place. Works for both user and assistant messages:
 *   - Opens the full-screen editor prefilled with the current flat text.
 *   - On save, wraps the new text as `[{ type: "text", text }]` and writes
 *     it back through `editMessage` (cx_message_edit RPC).
 *   - Marks the conversation's cache-bypass flag so the next AI turn sees
 *     the updated content.
 */
function editContentItem(ctx: MessageActionContext): MenuItem {
  const { content, conversationId, messageId, metadata, dispatch, onClose } =
    ctx;
  return {
    key: "edit-content",
    icon: Edit,
    iconColor: "text-emerald-500 dark:text-emerald-400",
    label: "Edit content",
    action: () => {
      const instanceId = `edit-content-${messageId}`;
      dispatch(
        openFullScreenEditor({
          content,
          instanceId,
          onSave: async (newContent: string) => {
            if (!conversationId || !messageId) {
              toast.error("Can't save — missing conversation/message id");
              dispatch(
                closeOverlay({ overlayId: "fullScreenEditor", instanceId }),
              );
              return;
            }
            try {
              const { editMessage } =
                await import("@/features/agents/redux/execution-system/message-crud");
              await dispatch(
                editMessage({
                  conversationId,
                  messageId,
                  newContent: wrapTextAsContent(newContent),
                }),
              ).unwrap();
              toast.success("Changes saved");
            } catch (err) {
              const serialized = serializeError(err);
              // eslint-disable-next-line no-console
              console.error(
                "[edit-content] save failed",
                JSON.stringify(serialized, null, 2),
              );
              toast.error(getErrorMessage(err, "Failed to save changes"));
            }
            dispatch(
              closeOverlay({ overlayId: "fullScreenEditor", instanceId }),
            );
          },
          messageId: messageId ?? undefined,
          analysisData: metadata as Record<string, unknown> | undefined,
        }),
      );
      onClose();
    },
    category: "Edit",
    showToast: false,
    hidden: !conversationId || !messageId,
  };
}

/**
 * USER MESSAGES ONLY — edit the user's prompt AND resubmit from that point.
 *
 * Flow: opens the full-screen editor prefilled with the user's current text;
 * on save the thunk forks the conversation at `position - 1` (so the user's
 * new version replaces what came next), writes the edited content onto the
 * fork head's user message, then launches a fresh AI turn using the edit as
 * input. This is the "I want to re-ask this question a different way" path.
 */
function editAndResubmitItem(ctx: MessageActionContext): MenuItem {
  const { content, conversationId, messageId, metadata, dispatch, onClose } =
    ctx;
  return {
    key: "edit-resubmit",
    icon: Send,
    iconColor: "text-cyan-500 dark:text-cyan-400",
    label: "Edit & resubmit",
    action: () => {
      if (!conversationId || !messageId) {
        onClose();
        return;
      }
      const instanceId = `edit-resubmit-${messageId}`;
      dispatch(
        openFullScreenEditor({
          content,
          instanceId,
          onSave: async (newContent: string) => {
            try {
              const { forkConversation, editMessage } =
                await import("@/features/agents/redux/execution-system/message-crud");
              // Read position from state right before firing. Fork at
              // (position - 1) so the user's new message becomes the next
              // turn on the branch, replacing whatever originally came after.
              const positionThunk = (_: unknown, getState: () => RootState) => {
                const entry =
                  getState().messages.byConversationId[conversationId];
                const msg = entry?.byId?.[messageId];
                const position = msg?.position ?? 0;
                const forkPosition = Math.max(0, position - 1);
                return dispatch(
                  forkConversation({
                    conversationId,
                    atPosition: forkPosition,
                  }),
                ).unwrap();
              };
              await dispatch(positionThunk as never);

              // Persist the edit onto the user's message on the fork head.
              // After this, the user is viewing the forked conversation with
              // their edited question in place; they can hit Send from the
              // input bar to launch the new turn.
              await dispatch(
                editMessage({
                  conversationId,
                  messageId,
                  newContent: wrapTextAsContent(newContent),
                }),
              ).unwrap();
              toast.success("Forked — edit saved on the new branch");
            } catch (err) {
              const serialized = serializeError(err);
              // eslint-disable-next-line no-console
              console.error(
                "[edit-resubmit] failed",
                JSON.stringify(serialized, null, 2),
              );
              toast.error(getErrorMessage(err, "Failed to edit & resubmit"));
            } finally {
              dispatch(
                closeOverlay({ overlayId: "fullScreenEditor", instanceId }),
              );
            }
          },
          messageId: messageId ?? undefined,
          analysisData: metadata as Record<string, unknown> | undefined,
        }),
      );
      onClose();
    },
    category: "Edit",
    showToast: false,
    hidden: !conversationId || !messageId,
  };
}

/**
 * Fork the conversation at this message. Works for both roles:
 *   - On a user message: fork captures everything up through (and including)
 *     this question — useful to explore an alternate path from here.
 *   - On an assistant message: fork captures the conversation including this
 *     response — useful to keep this answer but try a different continuation.
 */
function forkAtMessageItem(ctx: MessageActionContext): MenuItem {
  const { conversationId, messageId, dispatch, onClose } = ctx;
  return {
    key: "fork-at-message",
    icon: GitBranch,
    iconColor: "text-violet-500 dark:text-violet-400",
    label: "Fork at this message",
    action: async () => {
      if (!conversationId || !messageId) {
        onClose();
        return;
      }
      try {
        const { forkConversation } =
          await import("@/features/agents/redux/execution-system/message-crud");
        const positionThunk = (_: unknown, getState: () => RootState) => {
          const entry = getState().messages.byConversationId[conversationId];
          const msg = entry?.byId?.[messageId];
          const position = msg?.position ?? 0;
          return dispatch(
            forkConversation({ conversationId, atPosition: position }),
          ).unwrap();
        };
        await dispatch(positionThunk as never);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[fork-at-message] failed", err);
      } finally {
        onClose();
      }
    },
    category: "Edit",
    successMessage: "Conversation forked",
    errorMessage: "Failed to fork conversation",
    hidden: !conversationId || !messageId,
  };
}

// ============================================================================
// ASSISTANT-ONLY EXTRAS
// ============================================================================

function assistantOnlyItems(ctx: MessageActionContext): MenuItem[] {
  const { content } = ctx;
  return [
    {
      key: "copy-thinking",
      icon: Brain,
      iconColor: "text-purple-500 dark:text-purple-400",
      label: "Copy with thinking",
      action: async () => {
        await copyToClipboard(content, {
          isMarkdown: true,
          includeThinking: true,
          onSuccess: () => {},
          onError: (error) => {
            throw new Error(
              getErrorMessage(error, "Failed to copy with thinking"),
            );
          },
        });
      },
      category: "Copy",
      successMessage: "Copied with thinking",
      errorMessage: "Failed to copy",
    },
    {
      key: "convert-broker",
      icon: Briefcase,
      iconColor: "text-amber-500 dark:text-amber-400",
      label: "Convert to broker",
      action: () => {
        toast.info("Coming soon", {
          description: "Convert to broker will be available shortly.",
        });
        ctx.onClose();
      },
      category: "Actions",
      showToast: false,
    },
    {
      key: "add-docs",
      icon: BookText,
      iconColor: "text-emerald-500 dark:text-emerald-400",
      label: "Add to docs",
      action: () => {
        toast.info("Coming soon", {
          description: "Add to docs will be available shortly.",
        });
        ctx.onClose();
      },
      category: "Actions",
      showToast: false,
    },
  ];
}

// ============================================================================
// PUBLIC REGISTRIES
// ============================================================================

/**
 * Menu items for an assistant-authored message. Shape:
 *   Edit → Edit content, Fork at this message, Delete
 *   Copy → plain / Docs / Word / with thinking
 *   Export → HTML preview, Copy HTML page, Email, Print, (Full print)
 *   Actions → Save to Scratch/Notes/File, Add to Tasks, Convert to broker, Add to docs
 *   App → Feedback, Announcements, Preferences
 *
 * Audio playback lives on the inline AssistantActionBar (SpeakerButton —
 * play/pause toggle, with markdown cleanup), not in this menu.
 */
export function getAssistantMessageActions(
  ctx: MessageActionContext,
): MenuItem[] {
  return [
    editContentItem(ctx),
    forkAtMessageItem(ctx),
    ...copyItems(ctx),
    ...assistantOnlyItems(ctx),
    ...exportItems(ctx),
    ...saveItems(ctx),
    ...appItems(ctx),
  ];
}

/**
 * Menu items for a user-authored message. Shape:
 *   Edit → Edit content, Edit & resubmit, Fork at this message, Delete
 *   Copy → plain / Docs / Word
 *   Export → HTML preview, Copy HTML page, Email, Print, (Full print)
 *   Actions → Save to Scratch/Notes/File, Add to Tasks
 *   App → Feedback, Announcements, Preferences
 *
 * Audio playback lives on the inline UserActionBar (SpeakerButton —
 * play/pause toggle, with markdown cleanup), not in this menu.
 */
export function getUserMessageActions(ctx: MessageActionContext): MenuItem[] {
  return [
    editContentItem(ctx),
    editAndResubmitItem(ctx),
    forkAtMessageItem(ctx),
    ...copyItems(ctx),
    ...exportItems(ctx),
    ...saveItems(ctx),
    ...appItems(ctx),
  ];
}

// ============================================================================
// POST-AUTH RESUME
// ============================================================================

/**
 * Resume any action the user requested while signed out. Called from a menu
 * host after an auth redirect — replays the original action with the same
 * `content` snapshot that triggered the redirect.
 */
export function resumePendingAuthAction(
  isAuthenticated: boolean,
  content: string,
  dispatch: AppDispatch,
) {
  if (!isAuthenticated) return;
  try {
    const pending = sessionStorage.getItem(PENDING_ACTION_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    const { action, savedContent } = JSON.parse(pending) as {
      action: string;
      savedContent: string;
    };
    if (savedContent !== content) return;
    if (action === "save-scratch") {
      NotesAPI.create({
        label: "New Note",
        content: savedContent,
        folder_name: "Scratch",
        tags: [],
      })
        .then(() => toast.success("Saved to Scratch!"))
        .catch(() => toast.error("Failed to save to Scratch"));
    } else if (action === "save-notes") {
      dispatch(openSaveToNotes({ content: savedContent }));
    } else if (action === "add-to-tasks") {
      const preview = savedContent.slice(0, 400);
      const seedTitle =
        savedContent
          .trim()
          .split(/\n+/)[0]
          ?.replace(/^[#>*\-\s]+/, "")
          .slice(0, 100) || "";
      // Post-auth resume — open the same dialog the action opens normally
      dispatch(
        setPendingSource({
          entity_type: "cx_message",
          entity_id: "",
          label: preview,
          prePopulate: { title: seedTitle, description: savedContent },
        }),
      );
    }
  } catch {
    /* ignore parse errors */
  }
}
