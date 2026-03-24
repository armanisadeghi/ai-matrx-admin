"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/styles/themes/utils";

interface Card {
  front: string;
  back: string | null;
}

interface FlashcardMobileViewProps {
  cards: Card[];
  initialIndex?: number;
  onClose: () => void;
}

const FlashcardMobileView: React.FC<FlashcardMobileViewProps> = ({
  cards,
  initialIndex = 0,
  onClose,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  // slide direction for enter animation: "left" = new card slides in from right, "right" = from left
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  // vertical swipe dismiss tracking
  const [dragY, setDragY] = useState(0);
  const animTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const card = cards[index];
  const total = cards.length;

  const goTo = useCallback(
    (nextIndex: number, dir: "left" | "right") => {
      if (isAnimating) return;
      setIsAnimating(true);
      setSlideDir(dir);
      setIsFlipped(false);
      if (animTimeout.current) clearTimeout(animTimeout.current);
      animTimeout.current = setTimeout(() => {
        setIndex(nextIndex);
        setSlideDir(null);
        setIsAnimating(false);
      }, 280);
    },
    [isAnimating],
  );

  const goNext = useCallback(() => {
    if (index < total - 1) goTo(index + 1, "left");
  }, [index, total, goTo]);

  const goPrev = useCallback(() => {
    if (index > 0) goTo(index - 1, "right");
  }, [index, goTo]);

  const handlers = useSwipeable({
    onSwipedLeft: () => goNext(),
    onSwipedRight: () => goPrev(),
    onSwiping: (e) => {
      if (e.dir === "Up" || e.dir === "Down") {
        setDragY(e.deltaY);
      }
    },
    onSwipedUp: () => {
      setDragY(0);
      onClose();
    },
    onSwipedDown: () => {
      setDragY(0);
      onClose();
    },
    onTouchEndOrOnMouseUp: () => {
      // snap back if not dismissed
      setDragY(0);
    },
    trackMouse: false,
    trackTouch: true,
    delta: 40,
    preventScrollOnSwipe: true,
  });

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Request fullscreen on mobile
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    return () => {
      document.body.style.overflow = prev;
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
      else if (e.key === " " || e.key === "Enter") setIsFlipped((f) => !f);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    return () => { if (animTimeout.current) clearTimeout(animTimeout.current); };
  }, []);

  // Opacity fades as user drags vertically
  const dragOpacity = Math.max(0.3, 1 - Math.abs(dragY) / 300);
  const dragTranslate = dragY * 0.4;

  const isMultiLine = card?.back != null && card.back.includes("\n");

  const getTextSize = (text: string, multiLine = false) => {
    const l = text.length;
    if (multiLine) {
      if (l < 120) return "text-2xl";
      if (l < 200) return "text-xl";
      if (l < 320) return "text-lg";
      if (l < 500) return "text-base";
      return "text-sm";
    }
    if (l < 20)  return "text-4xl md:text-5xl";
    if (l < 40)  return "text-3xl md:text-4xl";
    if (l < 80)  return "text-2xl md:text-3xl";
    if (l < 140) return "text-xl md:text-2xl";
    if (l < 220) return "text-lg md:text-xl";
    if (l < 320) return "text-base md:text-lg";
    return "text-sm md:text-base";
  };

  const renderBack = () => {
    if (card.back === null) return <span className="text-lg opacity-60 animate-pulse">Loading...</span>;
    if (!isMultiLine) return card.back;
    return card.back.split("\n").map((line, i) => (
      <div key={i} className={line === "" ? "h-2" : undefined}>{line}</div>
    ));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      style={{ opacity: dragOpacity, transform: `translateY(${dragTranslate}px)`, transition: dragY === 0 ? "opacity 0.2s, transform 0.2s" : "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-3 pb-2 select-none">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="p-2 rounded-full text-white/60 hover:text-white disabled:opacity-20 transition-opacity"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-white/70 text-sm font-medium">{index + 1} / {total}</span>
          {/* Dot indicators — show up to 9, then truncate */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(total, 9) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i === index % 9 ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30",
                )}
              />
            ))}
            {total > 9 && <div className="w-1.5 h-1.5 rounded-full bg-white/30" />}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full text-white/60 hover:text-white transition-opacity"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Card area — full remaining height */}
      <div
        {...handlers}
        className="flex-1 flex items-center justify-center px-4 pb-safe pb-6 select-none"
        onClick={() => !isAnimating && setIsFlipped((f) => !f)}
      >
        <div
          className={cn(
            "relative w-full max-w-lg transition-all duration-280",
            slideDir === "left" && "animate-slide-in-from-right",
            slideDir === "right" && "animate-slide-in-from-left",
          )}
          style={{ height: "min(65vh, 480px)", perspective: "1200px" }}
        >
          <div
            className="absolute inset-0 transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-900 to-indigo-950 border border-blue-700/50 shadow-2xl"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className={cn("text-center font-semibold text-white leading-snug w-full", getTextSize(card?.front ?? ""))}>
                {card?.front}
              </div>
              <div className="absolute bottom-3 right-4 text-[10px] text-blue-400/50">tap to flip</div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col p-6 bg-gradient-to-br from-green-900 to-emerald-950 border border-green-700/50 shadow-2xl overflow-hidden"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div
                className={cn(
                  "font-medium text-white overflow-y-auto scrollbar-none w-full",
                  isMultiLine ? "text-left leading-snug h-full" : "text-center leading-relaxed m-auto",
                  getTextSize(card?.back ?? "", isMultiLine),
                )}
              >
                {renderBack()}
              </div>
              <div className="absolute bottom-3 right-4 text-[10px] text-green-400/50">tap to flip</div>
            </div>
          </div>
        </div>
      </div>

      {/* Swipe hint shown on first card only */}
      {index === 0 && (
        <div className="text-center pb-safe pb-3 text-white/30 text-xs select-none pointer-events-none">
          swipe left/right to navigate · swipe up/down to close
        </div>
      )}
      {index > 0 && (
        <div className="pb-safe pb-3" />
      )}
    </div>
  );
};

export default FlashcardMobileView;
