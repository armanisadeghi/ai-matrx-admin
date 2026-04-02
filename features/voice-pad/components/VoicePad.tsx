"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { ChevronUp, GripVertical, X, Mic } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { closeOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  selectVoicePadSize,
  selectVoicePadEntries,
  selectVoicePadDraftText,
  toggleVoicePadSize,
  addTranscriptEntry,
  removeTranscriptEntry,
  clearAllEntries,
  setDraftText,
} from "@/lib/redux/slices/voicePadSlice";

const VoicePadExpanded = lazy(() => import("./VoicePadExpanded"));

interface Position {
  x: number;
  y: number;
}

function CollapsedPill({
  onDragStart,
  onExpand,
  onClose,
}: {
  onDragStart: (e: React.MouseEvent) => void;
  onExpand: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-lg px-1.5 py-1 cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onDragStart}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
      <button
        type="button"
        onClick={onExpand}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1 rounded-full text-primary hover:bg-primary/10 transition-colors"
        aria-label="Expand voice pad"
      >
        <Mic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onExpand}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-0.5 text-muted-foreground hover:text-foreground"
        aria-label="Expand"
      >
        <ChevronUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={onClose}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-0.5 text-muted-foreground hover:text-destructive"
        aria-label="Close voice pad"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function ExpandedLoadingFallback() {
  return (
    <div className="w-80 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-xl p-3">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Mic className="h-4 w-4 animate-pulse" />
        <span>Loading voice pad...</span>
      </div>
    </div>
  );
}

export default function VoicePad() {
  const dispatch = useAppDispatch();
  const size = useAppSelector(selectVoicePadSize);
  const entries = useAppSelector(selectVoicePadEntries);
  const draftText = useAppSelector(selectVoicePadDraftText);

  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - 340,
    y: 60,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsDragging(true);
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(
          0,
          Math.min(e.clientX - dragOffset.x, window.innerWidth - 100),
        ),
        y: Math.max(
          0,
          Math.min(e.clientY - dragOffset.y, window.innerHeight - 50),
        ),
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleClose = useCallback(() => {
    dispatch(closeOverlay({ overlayId: "voicePad" }));
  }, [dispatch]);

  const handleToggleSize = useCallback(() => {
    dispatch(toggleVoicePadSize());
  }, [dispatch]);

  const handleTranscriptionComplete = useCallback(
    (text: string) => {
      if (text.trim()) {
        dispatch(addTranscriptEntry(text));
      }
    },
    [dispatch],
  );

  const handleRemoveEntry = useCallback(
    (id: string) => {
      dispatch(removeTranscriptEntry(id));
    },
    [dispatch],
  );

  const handleClearAll = useCallback(() => {
    dispatch(clearAllEntries());
  }, [dispatch]);

  const handleDraftChange = useCallback(
    (text: string) => {
      dispatch(setDraftText(text));
    },
    [dispatch],
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9998,
        userSelect: isDragging ? "none" : "auto",
        cursor: isDragging ? "grabbing" : "default",
        transition: isDragging ? "none" : "filter 0.2s ease",
        filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))",
      }}
    >
      {size === "collapsed" ? (
        <CollapsedPill
          onDragStart={handleMouseDown}
          onExpand={handleToggleSize}
          onClose={handleClose}
        />
      ) : (
        <Suspense fallback={<ExpandedLoadingFallback />}>
          <VoicePadExpanded
            entries={entries}
            draftText={draftText}
            onDragStart={handleMouseDown}
            onCollapse={handleToggleSize}
            onClose={handleClose}
            onTranscriptionComplete={handleTranscriptionComplete}
            onRemoveEntry={handleRemoveEntry}
            onClearAll={handleClearAll}
            onDraftChange={handleDraftChange}
          />
        </Suspense>
      )}
    </div>
  );
}
