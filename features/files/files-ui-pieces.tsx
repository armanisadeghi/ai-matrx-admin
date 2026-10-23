"use client";

/**
 * The files UI's heavy host pieces — the file right-click menu, the v3 context menu and the error
 * copy menu — registered into `files-ui-host.tsx`'s slots.
 *
 * Imported for its side effect ONLY by `app/DeferredSingletonCore.tsx`, i.e. behind the one
 * deferred-singletons `next/dynamic` edge, which every signed-in shell (AppShell, the public full
 * tier, applets, portal, link pages) renders. Never import it from a root-reachable module
 * (`files-host.ts`, the store, a provider): see the BUILD-GRAPH LAW in `files-ui-host.tsx`.
 * Each piece still loads on first render; while it loads the wrapped element renders on its own.
 */

import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import type {
  FilesContextMenuProps,
  FilesFileMenuProps,
} from "@ai-matrx/media/files/engine/host/ui";
import { registerFilesUiPieces } from "@/features/files/files-ui-host";

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

registerFilesUiPieces({
  FileMenu: lazyWrapper<FilesFileMenuProps>(() =>
    import("@/features/files/components/core/FileContextMenu/FileRightClickMenu").then((m) => m.FileRightClickMenu),
  ),
  ContextMenu: lazyWrapper<FilesContextMenuProps>(() =>
    import("@ai-matrx/context-menu/react").then((m) => m.NonEditableContextMenu as unknown as ComponentType<FilesContextMenuProps>),
  ),
  ErrorAlchemyMenu: lazyPiece<Loose>(() =>
    import("@/components/errors/ErrorAlchemyMenu").then((m) => m.ErrorAlchemyMenu as unknown as ComponentType<Loose>),
  ),
});
