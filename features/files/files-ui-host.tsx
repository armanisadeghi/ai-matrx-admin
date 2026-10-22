"use client";

/**
 * The website's answers to the files UI's host ports (`@ai-matrx/media/files/engine/host/ui`),
 * handed to `configureFilesHost({ ui })` in `files-host.ts`. Each heavy piece loads on first use;
 * while it loads the wrapped element renders on its own, never a blank.
 */

import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import type {
  FilesContextMenuProps,
  FilesFileMenuProps,
  FilesUiHost,
} from "@ai-matrx/media/files/engine/host/ui";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { openFilePreview } from "@/features/files/components/preview/openFilePreview";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Loose = Record<string, any>;

/** A lazily loaded wrapper whose children show while it loads. */
function lazyWrapper<P extends { children?: ReactNode }>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  const Lazy = lazy(async () => ({ default: await load() }));
  return function LazyWrapper(props: P) {
    return (
      <Suspense fallback={<>{props.children}</>}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

function lazyPiece<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  const Lazy = lazy(async () => ({ default: await load() }));
  return function LazyPiece(props: P) {
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

export const filesUiHost: FilesUiHost = {
  openPreview: (fileId, tab) => {
    openFilePreview(fileId);
    if (tab && tab !== "preview" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cloud-files:open-preview-tab", { detail: { fileId, tab } }));
    }
  },
  FileMenu: lazyWrapper<FilesFileMenuProps>(() =>
    import("@/features/files/components/core/FileContextMenu/FileRightClickMenu").then((m) => m.FileRightClickMenu),
  ),
  ContextMenu: lazyWrapper<FilesContextMenuProps>(() =>
    import("@ai-matrx/context-menu/react").then((m) => m.NonEditableContextMenu as unknown as ComponentType<FilesContextMenuProps>),
  ),
  ErrorAlchemyMenu: lazyPiece<Loose>(() =>
    import("@/components/errors/ErrorAlchemyMenu").then((m) => m.ErrorAlchemyMenu as unknown as ComponentType<Loose>),
  ),
  copyNotify,
};
