"use client";

/**
 * SearchReviewWindow — "Review search results", the platform primitive (features/search-review/FEATURE.md).
 *
 * The window is the FRAME only: it reads the live session its host published (by id) and wraps the
 * canonical `SearchReviewBody`, which renders every result through the Search Lab's own `web_result`
 * component. When the host page that owns the session is gone, the window says so instead of
 * collecting answers that would go nowhere.
 */

import { SearchX } from "lucide-react";
import { EmptyState } from "@ai-matrx/design-system/controls";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { SearchReviewBody } from "@/features/search-review/SearchReviewBody";
import { useSearchReviewSession } from "@/features/search-review/sessionStore";

export interface SearchReviewWindowProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export default function SearchReviewWindow({ isOpen, onClose, sessionId }: SearchReviewWindowProps) {
  if (!isOpen) return null;
  return <SearchReviewWindowInner onClose={onClose} sessionId={sessionId} />;
}

function SearchReviewWindowInner({ onClose, sessionId }: Omit<SearchReviewWindowProps, "isOpen">) {
  const session = useSearchReviewSession(sessionId);
  return (
    <WindowPanel
      id="search-review-window"
      overlayId="searchReviewWindow"
      title={session?.title || "Review search results"}
      onClose={onClose}
      width={820}
      height={760}
      minWidth={380}
      minHeight={360}
      position="top-right"
      urlSyncId={sessionId}
      onCollectData={() => ({ sessionId })}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      {session ? (
        <SearchReviewBody session={session} />
      ) : (
        <div className="flex flex-1 items-center justify-center p-6" data-testid="search-review-closed">
          <EmptyState icon={<SearchX aria-hidden />} title="These results closed with their page" line="Open the review again from the page that found them." />
        </div>
      )}
    </WindowPanel>
  );
}
