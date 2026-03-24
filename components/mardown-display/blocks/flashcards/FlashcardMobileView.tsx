"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/styles/themes/utils";

const ANIM_MS = 320;
const TEXT_FADE_OUT_MS = 120;

interface Card {
  front: string;
  back: string | null;
}

interface FlashcardMobileViewProps {
  cards: Card[];
  initialIndex?: number;
  onClose: () => void;
}

// A single rendered card face (used for both current and outgoing)
interface CardSlideProps {
  card: Card;
  isFlipped: boolean;
  style?: React.CSSProperties;
  className?: string;
  showHints?: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  textVisible?: boolean;
}

const CardSlide: React.FC<CardSlideProps> = ({ card, isFlipped, style, className, showHints, canGoPrev, canGoNext, textVisible = true }) => {
  const isMultiLine = card.back != null && card.back.includes("\n");

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
      className={cn("absolute inset-0", className)}
      style={{ perspective: "1200px", ...style }}
    >
      {/* 3D flip container */}
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-950"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div
            className={cn("text-center font-semibold text-white leading-snug w-full px-6", getTextSize(card.front ?? ""))}
            style={{ opacity: textVisible ? 1 : 0, transition: `opacity ${TEXT_FADE_OUT_MS}ms ease` }}
          >
            {card.front}
          </div>

          {showHints && (
            <div className="absolute inset-0 flex items-end pointer-events-none select-none">
              <div className={cn("flex-1 flex items-center justify-start pl-3 pb-3", canGoPrev ? "text-white/30" : "text-white/10")}>
                <ChevronLeft className="h-4 w-4 mr-0.5" />
                <span className="text-[10px]">prev</span>
              </div>
              <div className="flex-1 flex items-center justify-center pb-3 text-blue-300/40 text-[10px]">
                tap to flip
              </div>
              <div className={cn("flex-1 flex items-center justify-end pr-3 pb-3", canGoNext ? "text-white/30" : "text-white/10")}>
                <span className="text-[10px]">next</span>
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 flex flex-col bg-gradient-to-br from-green-900 to-emerald-950 overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div
            className={cn(
              "font-medium text-white overflow-y-auto scrollbar-none w-full px-6 pt-6",
              isMultiLine ? "text-left leading-snug h-full" : "text-center leading-relaxed m-auto",
              getTextSize(card.back ?? "", isMultiLine),
            )}
            style={{ opacity: textVisible ? 1 : 0, transition: `opacity ${TEXT_FADE_OUT_MS}ms ease` }}
          >
            {renderBack()}
          </div>

          {showHints && (
            <div className="absolute inset-0 flex items-end pointer-events-none select-none">
              <div className={cn("flex-1 flex items-center justify-start pl-3 pb-3", canGoPrev ? "text-white/30" : "text-white/10")}>
                <ChevronLeft className="h-4 w-4 mr-0.5" />
                <span className="text-[10px]">prev</span>
              </div>
              <div className="flex-1 flex items-center justify-center pb-3 text-green-300/40 text-[10px]">
                tap to flip
              </div>
              <div className={cn("flex-1 flex items-center justify-end pr-3 pb-3", canGoNext ? "text-white/30" : "text-white/10")}>
                <span className="text-[10px]">next</span>
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Text fades back in shortly after the new card is set (40ms delay added in goTo)

const FlashcardMobileView: React.FC<FlashcardMobileViewProps> = ({
  cards,
  initialIndex = 0,
  onClose,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [transition, setTransition] = useState<{
    outgoingIndex: number;
    dir: "left" | "right";
  } | null>(null);
  const [textVisible, setTextVisible] = useState(true);
  const [dragY, setDragY] = useState(0);
  const animTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const card = cards[index];
  const total = cards.length;
  const isAnimating = transition !== null;

  const goTo = useCallback(
    (nextIndex: number, dir: "left" | "right") => {
      if (isAnimating) return;
      // Fade text out immediately
      setTextVisible(false);
      setTransition({ outgoingIndex: index, dir });
      setIsFlipped(false);
      if (animTimeout.current) clearTimeout(animTimeout.current);
      if (textTimeout.current) clearTimeout(textTimeout.current);
      animTimeout.current = setTimeout(() => {
        setIndex(nextIndex);
        setTransition(null);
        // Fade text back in shortly after new card is set
        textTimeout.current = setTimeout(() => setTextVisible(true), 40);
      }, ANIM_MS);
    },
    [isAnimating, index],
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
      if (e.dir === "Up" || e.dir === "Down") setDragY(e.deltaY);
    },
    onSwipedUp: () => { setDragY(0); onClose(); },
    onSwipedDown: () => { setDragY(0); onClose(); },
    onTouchEndOrOnMouseUp: () => setDragY(0),
    trackMouse: false,
    trackTouch: true,
    delta: 40,
    preventScrollOnSwipe: true,
  });

  // Lock body scroll + request fullscreen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
    return () => {
      if (animTimeout.current) clearTimeout(animTimeout.current);
      if (textTimeout.current) clearTimeout(textTimeout.current);
    };
  }, []);

  const dragOpacity = Math.max(0.3, 1 - Math.abs(dragY) / 300);
  const dragTranslate = dragY * 0.4;

  // Outgoing exits in the direction of travel; incoming enters from the opposite side
  // dir "left" = going to next card: outgoing exits left, incoming enters from right
  const outgoingExit = transition?.dir === "left"
    ? { transform: "translateX(-100%)", opacity: 0, transition: `transform ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${ANIM_MS}ms ease` }
    : { transform: "translateX(100%)",  opacity: 0, transition: `transform ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${ANIM_MS}ms ease` };

  const incomingEnter = transition?.dir === "left"
    ? { transform: "translateX(0)",    opacity: 1, transition: `transform ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${ANIM_MS}ms ease`, animation: `mobile-card-enter-right ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) both` }
    : { transform: "translateX(0)",    opacity: 1, transition: `transform ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${ANIM_MS}ms ease`, animation: `mobile-card-enter-left ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) both` };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      style={{
        opacity: dragOpacity,
        transform: `translateY(${dragTranslate}px)`,
        transition: dragY === 0 ? "opacity 0.2s, transform 0.2s" : "none",
      }}
    >
      {/* Header — minimal, no side padding waste */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 select-none shrink-0">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="p-1.5 rounded-full text-white/50 hover:text-white disabled:opacity-20 transition-opacity"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-white/60 text-xs font-medium">{index + 1} / {total}</span>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(total, 11) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i === index % 11 ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/25",
                )}
              />
            ))}
            {total > 11 && <div className="w-1.5 h-1.5 rounded-full bg-white/25" />}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-white/50 hover:text-white transition-opacity"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Card area — zero padding, full remaining space */}
      <div
        {...handlers}
        className="flex-1 relative overflow-hidden select-none"
        onClick={() => !isAnimating && setIsFlipped((f) => !f)}
      >
        {/* Outgoing card (only during transition) */}
        {transition && (
          <CardSlide
            card={cards[transition.outgoingIndex]}
            isFlipped={false}
            style={outgoingExit}
            canGoPrev={transition.outgoingIndex > 0}
            canGoNext={transition.outgoingIndex < total - 1}
          />
        )}

        {/* Current (incoming) card */}
        <CardSlide
          card={card}
          isFlipped={isFlipped}
          style={transition ? incomingEnter : undefined}
          showHints
          canGoPrev={index > 0}
          canGoNext={index < total - 1}
          textVisible={textVisible}
        />
      </div>
    </div>
  );
};

export default FlashcardMobileView;
