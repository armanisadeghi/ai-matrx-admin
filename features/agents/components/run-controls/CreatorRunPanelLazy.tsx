"use client";
// The creator panel enters chat's run column through the CreatorRunPanel slot; loaded on demand
// (admin-gated, heavy), exactly as chat's own next/lazy wrapper loaded it before B1.
import dynamic from "next/dynamic";

const LazyCreatorRunPanel = dynamic(
  () => import("./CreatorRunPanel").then((m) => ({ default: m.CreatorRunPanel })),
  // The collapsed bar's own height (27px: measured), held while the chunk loads — the empty fallback let the
  // composer grow 27px under the conversation when the panel arrived.
  { ssr: false, loading: () => <div aria-hidden className="h-[27px] border-t border-l border-r border-border" /> },
);

/** The slot's shape: chat names the conversations and surface; the tab subset is the builder's own. */
export function CreatorRunPanelLazy({
  tabs: _tabs,
  ...props
}: {
  conversationId: string;
  displayConversationId?: string;
  surfaceKey: string;
  tabs?: string[];
}) {
  return <LazyCreatorRunPanel {...props} />;
}
