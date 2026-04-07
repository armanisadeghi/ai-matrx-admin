"use client";

import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { NewsFloatingWorkspace } from "@/features/news/components/NewsFloatingWorkspace";

interface NewsWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Thin shell: floating window chrome is provided by WindowPanel
 * while news logic stays in the news feature.
 */
export default function NewsWindow({ isOpen, onClose }: NewsWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      title="News Hub"
      id="news-window-default"
      minWidth={380}
      minHeight={320}
      width={680}
      height={540}
      onClose={onClose}
      urlSyncKey="news"
      urlSyncId="default"
    >
      <NewsFloatingWorkspace />
    </WindowPanel>
  );
}
