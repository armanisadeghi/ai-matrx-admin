"use client";

import React, { useState } from "react";
import { History, RotateCcw, Clock, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppSelector } from "@/lib/redux/hooks";
import { convertCxContentToDisplay } from "@/features/public-chat/utils/cx-content-converter";
import type {
  CxContentHistoryEntry,
  CxContentBlock,
} from "@/features/public-chat/types/cx-tables";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// TODO: Broken after agents refactor — legacy-shim was deleted. These stubs
// keep the component type-checking until it is rewired to the new slice.
const selectMessageContentHistory = (
  _state: unknown,
  _sessionId: string,
  _messageId: string,
): CxContentHistoryEntry[] => [];
const editMessage = (payload: {
  sessionId: string;
  messageId: string;
  newContent: CxContentBlock[];
}) => {
  void payload;
  return { unwrap: async () => undefined, type: "noop" } as unknown as {
    unwrap: () => Promise<void>;
    type: string;
  };
};

interface ContentHistoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  messageId: string;
}

function HistoryEntryCard({
  entry,
  index,
  isRestoring,
  onRestore,
}: {
  entry: CxContentHistoryEntry;
  index: number;
  isRestoring: boolean;
  onRestore: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const blocks = Array.isArray(entry.content) ? entry.content : [];
  const preview = convertCxContentToDisplay(blocks as CxContentBlock[]).content;
  const truncated =
    preview.length > 200 ? `${preview.slice(0, 200)}...` : preview;
  const savedAt = new Date(entry.saved_at);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-foreground">
              Version {index + 1}
            </span>
            <span className="text-[10px] text-muted-foreground ml-2">
              {savedAt.toLocaleDateString()} {savedAt.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <ChevronRight
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border">
          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {preview}
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={isRestoring}
              onClick={onRestore}
            >
              <RotateCcw className="w-3 h-3" />
              Restore this version
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryContent({
  sessionId,
  messageId,
  onClose,
}: {
  sessionId: string;
  messageId: string;
  onClose: () => void;
}) {
  const history = useAppSelector((state) =>
    selectMessageContentHistory(state, sessionId, messageId),
  );
  const [restoringIndex, setRestoringIndex] = useState<number | null>(null);

  const handleRestore = async (entry: CxContentHistoryEntry, index: number) => {
    setRestoringIndex(index);
    try {
      await editMessage({
        sessionId,
        messageId,
        newContent: entry.content as CxContentBlock[],
      }).unwrap();
      onClose();
    } catch {
      setRestoringIndex(null);
    }
  };

  if (!history || history.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No edit history available for this message.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[60dvh]">
      <div className="space-y-2 p-1">
        {history.map((entry, i) => (
          <HistoryEntryCard
            key={`${entry.saved_at}-${i}`}
            entry={entry}
            index={i}
            isRestoring={restoringIndex === i}
            onRestore={() => handleRestore(entry, i)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

export function ContentHistoryViewer({
  isOpen,
  onClose,
  sessionId,
  messageId,
}: ContentHistoryViewerProps) {
  const isMobile = useIsMobile();

  const title = "Edit History";
  const description = "View and restore previous versions of this message.";

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <History className="w-4 h-4" />
              {title}
            </DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 pb-safe">
            <HistoryContent
              sessionId={sessionId}
              messageId={messageId}
              onClose={onClose}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <HistoryContent
          sessionId={sessionId}
          messageId={messageId}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
