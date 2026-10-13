"use client";

/**
 * The context-item drawer bodies the app owns (notes, tasks), registered into `@ai-matrx/chat`
 * (P20, CPM-009b). A bare host draws the package's generic body with a "not set up here" line.
 * Imported for its side effect by `providers/ChatSurfaceRegistrations.tsx`.
 *
 * Registration is synchronous; each slot is a `clientLazy` component over the ONE impl module
 * `./contextBodiesImpl` (one async edge), so the note and task editors load when a drawer opens,
 * never with the shell. A body shows a skeleton while it loads; the title actions and the footer
 * (small chrome that arrives in the same chunk) show nothing until then.
 */

import type { ComponentProps, ComponentType } from "react";
import { registerChatUi } from "@ai-matrx/chat/host/ui-slots";
import { clientLazy } from "@ai-matrx/kit/client-lazy";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";

type ContextBodyImpls = typeof import("./contextBodiesImpl");
type ContextBodyName = keyof ContextBodyImpls;

const loadContextBodies = (): Promise<ContextBodyImpls> => import("./contextBodiesImpl");

function ContextBodyLoading() {
  return <RegionSkeleton shape="rows" count={4} twoLine aria-label="Loading" />;
}

function lazyContextBody<K extends ContextBodyName>(
  name: K,
  loading?: ComponentType,
): ComponentType<ComponentProps<ContextBodyImpls[K]>> {
  const Lazy = clientLazy<ComponentProps<ContextBodyImpls[K]>>(
    async () => (await loadContextBodies())[name] as ComponentType<ComponentProps<ContextBodyImpls[K]>>,
    loading ? { loading } : {},
  );
  Lazy.displayName = `Lazy(${name})`;
  return Lazy;
}

registerChatUi({
  NoteBody: lazyContextBody("NoteBody", ContextBodyLoading),
  NoteFooter: lazyContextBody("NoteFooter"),
  NoteTitleActions: lazyContextBody("NoteTitleActions"),
  TaskBody: lazyContextBody("TaskBody", ContextBodyLoading),
});
