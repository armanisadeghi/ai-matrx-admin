"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { peekHandle } from "@ai-matrx/summon/boot-kit";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { WindowPanel } from "@ai-matrx/summon/window";
import { alchemyPanelId, type AlchemyWindowSession } from "@/components/agent-copy/alchemyWindowPort";

const NO_SESSION = () => () => {};
const NO_VIEW = () => null;

/** One Alchemy preparation session: its live render closure, redrawn whenever the package re-opens it. */
export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  const handleId = typeof (data as { handleId?: unknown } | null)?.handleId === "string" ? (data as { handleId: string }).handleId : "";
  const session = handleId ? peekHandle<AlchemyWindowSession>(handleId) : undefined;
  const view = useSyncExternalStore(session ? session.subscribe : NO_SESSION, session ? session.view : NO_VIEW, session ? session.view : NO_VIEW);

  // The session lives only in this page: without it (gone after a reload) there is nothing to draw.
  useEffect(() => {
    if (!session) close();
  }, [session, close]);
  if (!session || !view) return null;

  const size = view.size === undefined || view.size === "full" ? null : view.size;
  return (
    <WindowPanel
      id={alchemyPanelId(instanceId)}
      overlayId="alchemyPrepareWindow"
      overlayInstanceId={instanceId}
      title={view.title}
      width={size ? size.width : "96vw"}
      height={size ? size.height : "92dvh"}
      minWidth={520}
      minHeight={360}
      bodyClassName="bg-background"
    >
      {view.render(session.handle) as ReactNode}
    </WindowPanel>
  );
}
