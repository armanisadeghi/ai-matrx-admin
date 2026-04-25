"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CodeFilesAPI } from "@/features/code-files/service/codeFilesApi";
import { codeFilesActions } from "@/features/code-files/redux/slice";
import { createCodeFileThunk, loadCodeFolders } from "@/features/code-files/redux/thunks";
import { selectAllCodeFolders, selectCodeFoldersLoaded } from "@/features/code-files/redux/selectors";
import { type CodeFile, type CodeFolder } from "@/features/code-files/redux/code-files.types";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
/** Default top-level folder used for anything auto-saved from chat. Callers
 *  can override per-call. Kept as a constant so multiple callers agree on
 *  the destination without duplicating a string literal. */
export const CHAT_CAPTURES_FOLDER_NAME = "Chat Captures";

export interface SaveAndOpenInCodeEditorInput {
  /** File name shown in the tree and on the tab. Include an extension if you
   *  want syntax-correct language detection (e.g. "snippet.tsx"). */
  name: string;
  /** Monaco / `code_files.language` id. `plaintext` when unknown. */
  language: string;
  /** File body. Auto-routed to S3 by `CodeFilesAPI.create` when over the
   *  threshold. */
  content: string;
  /** Optional folder name. If present, the folder is created on first use
   *  (idempotent — reuses an existing top-level folder with the same name).
   *  Defaults to no folder (root-level file). */
  folderName?: string;
  /** Optional tags, stored on the `code_files` row. */
  tags?: string[];
  /** Free-form metadata stored with the row. Used by de-dup logic — e.g.
   *  `{ source: "chat-capture", messageId, conversationId, blockIndex }`. */
  metadata?: Record<string, unknown>;
  /** Navigate to `/code?open=<id>` after save (default: true). Set to
   *  `false` when the caller is already inside the `/code` workspace and
   *  only wants the file to show up in the tree. */
  navigate?: boolean;
  /** Route used when navigating. Defaults to `/code`. */
  codeRoute?: string;
}

export interface SaveAndOpenInCodeEditorResult {
  codeFile: CodeFile;
  folder: CodeFolder | null;
  navigated: boolean;
}

/**
 * The single integration point every code-generating surface (chat code
 * blocks, HTML preview modal, tool visualization previews, etc.) should use
 * to land content in the `/code` editor.
 *
 * Responsibilities:
 *   1. Resolve (or create) the target top-level folder by name.
 *   2. Create the `code_files` row via the thunk (auto S3-offload applies).
 *   3. Navigate to `/code?open=<id>` so the editor picks it up.
 *
 * Intentionally does _not_ pre-check for duplicates — callers that need
 * dedupe (auto-capture middleware, idempotent saves) should check their own
 * predicate against `state.codeFiles.files` metadata first.
 */
export function useSaveAndOpenInCodeEditor() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const router = useRouter();

  return useCallback(
    async (
      input: SaveAndOpenInCodeEditorInput,
    ): Promise<SaveAndOpenInCodeEditorResult> => {
      const folder = input.folderName
        ? await ensureTopLevelFolder(input.folderName, store, dispatch)
        : null;

      const codeFile = await dispatch(
        createCodeFileThunk({
          name: input.name,
          language: input.language,
          content: input.content,
          folder_id: folder?.id ?? null,
          tags: input.tags,
          metadata: input.metadata,
        }),
      ).unwrap();

      const shouldNavigate = input.navigate !== false;
      if (shouldNavigate) {
        const route = input.codeRoute ?? "/code";
        router.push(`${route}?open=${encodeURIComponent(codeFile.id)}`);
      }

      return { codeFile, folder, navigated: shouldNavigate };
    },
    [dispatch, router, store],
  );
}

// ── Folder resolution ───────────────────────────────────────────────────────

/** Case-insensitive lookup of a top-level folder by name; creates one if
 *  missing. Uses the existing `foldersLoaded` flag to avoid re-fetching the
 *  folder list on every call. */
async function ensureTopLevelFolder(
  name: string,
  store: ReturnType<typeof useAppStore>,
  dispatch: ReturnType<typeof useAppDispatch>,
): Promise<CodeFolder> {
  if (!selectCodeFoldersLoaded(store.getState())) {
    await dispatch(loadCodeFolders()).unwrap();
  }

  const normalized = name.trim().toLowerCase();
  const existing = selectAllCodeFolders(store.getState()).find(
    (f) => !f.parent_folder_id && f.name.trim().toLowerCase() === normalized,
  );
  if (existing) return existing;

  const created = await CodeFilesAPI.createFolder({ name });
  dispatch(codeFilesActions.upsertFolder(created));
  return created;
}
