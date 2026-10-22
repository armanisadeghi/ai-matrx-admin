"use client";

/**
 * ComputerThumbnail — the person's Cloud Computer at a glance, for a surface
 * that shows it beside something else (the agents messenger's Computer tab).
 * It is the SAME `ComputerView`, in its `"thumbnail"` variant — never a copy.
 *
 * Load law: nothing is read and no stream ticket is minted until the box is on
 * screen AND the page is visible; scrolling it away or hiding the browser tab
 * unmounts the view (its live picture closes with it). A press opens the ONE
 * Computer tab (`useOpenCloudComputerCanvas`), which takes the viewer seat;
 * the thumbnail then says "On the Computer tab" instead of fighting for it.
 */

import { useSyncExternalStore } from "react";
import { useInView } from "@ai-matrx/kit/hooks";
import { ComputerView, OPEN_COMPUTER_LABEL } from "./ComputerView";
import { useOpenCloudComputerCanvas } from "./useOpenCloudComputerCanvas";

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** Whether the browser tab is showing this page (false on the server). */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
}

export function ComputerThumbnail({ conversationId }: { conversationId?: string | null }) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: false });
  const pageVisible = usePageVisible();
  const openComputer = useOpenCloudComputerCanvas();
  const onOpen = () => openComputer({ conversationId: conversationId ?? undefined });
  const live = inView && pageVisible;

  return (
    <div ref={ref} className="w-full" data-cloud-computer-thumbnail-slot>
      {live ? (
        <ComputerView variant="thumbnail" conversationId={conversationId ?? undefined} onOpen={onOpen} />
      ) : (
        // Same box, nothing fetched: no layout shift when it goes live.
        <div
          className="relative w-full overflow-hidden rounded-md border border-border bg-muted"
          style={{ aspectRatio: "16 / 9" }}
        >
          <button type="button" aria-label={OPEN_COMPUTER_LABEL} onClick={onOpen} className="absolute inset-0" />
        </div>
      )}
    </div>
  );
}

export default ComputerThumbnail;
