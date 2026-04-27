"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useCodeWorkspace } from "../CodeWorkspaceProvider";
import { openTab } from "../redux/tabsSlice";
import { languageFromFilename } from "../styles/file-icon";
import { getFilePreviewProfile } from "@/features/files/utils/file-types";

/**
 * Returns a callback that opens a file from the active filesystem adapter
 * into a new (or existing) editor tab.
 *
 * Branches on the file's preview profile:
 *
 *   - `code` / `text` / `markdown` / `data` / `spreadsheet` / `generic` (with
 *     a text MIME) → the legacy text-read path. Bytes are pulled via
 *     `readFile()` and dropped into a Monaco-backed tab.
 *   - `image` / `video` / `audio` / `pdf` → opens a `binary-preview` tab.
 *     The bytes are NOT fetched here; the `BinaryFileViewer` does that
 *     lazily on mount and creates a `blob:` URL it owns. This avoids the
 *     `read failed (400): File is binary, use encoding=base64` error from
 *     the orchestrator and keeps base64 blobs out of Redux.
 *   - non-text generic (archives / 3D models / etc.) → also opens as a
 *     `binary-preview` tab and falls through to the GenericPreview download
 *     prompt.
 */
export function useOpenFile() {
  const dispatch = useAppDispatch();
  const { filesystem } = useCodeWorkspace();

  return useCallback(
    async (path: string) => {
      const name = path.split("/").pop() ?? path;
      const id = `${filesystem.id}:${path}`;
      const profile = getFilePreviewProfile(name, null, null);
      const kind = profile.previewKind;

      const isBinary =
        kind === "image" ||
        kind === "video" ||
        kind === "audio" ||
        kind === "pdf" ||
        // `generic` covers archives, 3D meshes, sqlite, office docs, etc.
        // Anything that isn't a known text MIME stays binary.
        kind === "generic";

      if (isBinary) {
        dispatch(
          openTab({
            id,
            path,
            name,
            language: "plaintext",
            content: "",
            pristineContent: "",
            kind: "binary-preview",
            mime: profile.mime,
          }),
        );
        return;
      }

      const content = await filesystem.readFile(path);
      dispatch(
        openTab({
          id,
          path,
          name,
          language: languageFromFilename(name),
          content,
          pristineContent: content,
          kind: "editor",
        }),
      );
    },
    [dispatch, filesystem],
  );
}
