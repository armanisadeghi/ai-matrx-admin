"use client";

/**
 * The website's answers to the files UI's host ports (`@ai-matrx/media/files/engine/host/ui`),
 * handed to `configureFilesHost({ ui })` in `files-host.ts`.
 *
 * BUILD-GRAPH LAW: `files-host.ts` is reached from the Redux store, so THIS module is in every
 * route's graph. It holds only cheap members (`openPreview`, `copyNotify`) and three slot
 * components. The heavy pieces (the file right-click menu, the v3 context menu, the error copy
 * menu) live in `files-ui-pieces.tsx`, which `app/DeferredSingletonCore.tsx` imports behind its one
 * `next/dynamic` edge and which hands them in through `registerFilesUiPieces`. Never import
 * `files-ui-pieces` (or any menu) from here — that one edge put the menus' async chunk group
 * into ~990 route entries and outgrew the 60 GB build machine (v0.4.3450).
 *
 * Until the pieces register, a slot renders its element alone (the package's own default); a
 * slot subscribes, so a menu rendered before registration gains its menu the moment it lands.
 */

import { useSyncExternalStore, type ComponentType } from "react";
import type {
  FilesContextMenuProps,
  FilesFileMenuProps,
  FilesUiHost,
} from "@ai-matrx/media/files/engine/host/ui";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { openFilePreview } from "@/features/files/components/preview/openFilePreview";

export interface FilesUiPieces {
  FileMenu?: ComponentType<FilesFileMenuProps>;
  ContextMenu?: ComponentType<FilesContextMenuProps>;
  ErrorAlchemyMenu?: FilesUiHost["ErrorAlchemyMenu"];
}

let pieces: FilesUiPieces = {};
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const readPieces = () => pieces;

function usePieces(): FilesUiPieces {
  return useSyncExternalStore(subscribe, readPieces, readPieces);
}

function FileMenuSlot(props: FilesFileMenuProps) {
  const Menu = usePieces().FileMenu;
  return Menu ? <Menu {...props} /> : <>{props.children}</>;
}

function ContextMenuSlot(props: FilesContextMenuProps) {
  const Menu = usePieces().ContextMenu;
  return Menu ? <Menu {...props} /> : <>{props.children}</>;
}

export const filesUiHost: FilesUiHost = {
  openPreview: (fileId, tab) => {
    openFilePreview(fileId);
    if (tab && tab !== "preview" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cloud-files:open-preview-tab", { detail: { fileId, tab } }));
    }
  },
  FileMenu: FileMenuSlot,
  ContextMenu: ContextMenuSlot,
  copyNotify,
};

/**
 * Hand in the heavy pieces (called once by `files-ui-pieces.tsx`). The error copy menu is read by
 * the package at render time (`ui().ErrorAlchemyMenu`), so it is set on the host object and the
 * package's "Copy error" button stands in until then.
 */
export function registerFilesUiPieces(next: FilesUiPieces): void {
  pieces = { ...pieces, ...next };
  if (next.ErrorAlchemyMenu) filesUiHost.ErrorAlchemyMenu = next.ErrorAlchemyMenu;
  for (const listener of listeners) listener();
}
