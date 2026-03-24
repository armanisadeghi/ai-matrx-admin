"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import {
  X,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  RotateCcw,
  Shuffle,
  LogOut,
  GripHorizontal,
} from "lucide-react";
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

// Hint overlay — left 20% = prev, center = flip, right 20% = next
const TapZoneHints: React.FC<{
  canGoPrev: boolean;
  canGoNext: boolean;
  menuOpen: boolean;
  flipColor: string;
}> = ({ canGoPrev, canGoNext, menuOpen, flipColor }) => (
  <div className="absolute inset-0 flex items-end pointer-events-none select-none">
    {/* Left tap zone label */}
    <div
      className={cn(
        "w-[20%] flex items-center justify-start pl-2 pb-3 transition-opacity duration-200",
        canGoPrev ? "text-white/40" : "text-white/15",
      )}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="text-[9px] leading-none">tap</span>
    </div>

    {/* Center flip hint */}
    <div className="flex-1 flex flex-col items-center justify-end pb-2 gap-0.5">
      <div className={cn("text-[10px]", flipColor)}>tap to flip</div>
      {!menuOpen && (
        <div className="text-white/20 text-[9px]">↑ swipe up for more</div>
      )}
    </div>

    {/* Right tap zone label */}
    <div
      className={cn(
        "w-[20%] flex items-center justify-end pr-2 pb-3 transition-opacity duration-200",
        canGoNext ? "text-white/40" : "text-white/15",
      )}
    >
      <span className="text-[9px] leading-none">tap</span>
      <ChevronRight className="h-4 w-4" />
    </div>
  </div>
);

interface CardSlideProps {
  card: Card;
  isFlipped: boolean;
  style?: React.CSSProperties;
  showHints?: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  textVisible?: boolean;
  menuOpen?: boolean;
}

const CardSlide: React.FC<CardSlideProps> = ({
  card,
  isFlipped,
  style,
  showHints,
  canGoPrev,
  canGoNext,
  textVisible = true,
  menuOpen = false,
}) => {
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
    if (l < 20) return "text-4xl md:text-5xl";
    if (l < 40) return "text-3xl md:text-4xl";
    if (l < 80) return "text-2xl md:text-3xl";
    if (l < 140) return "text-xl md:text-2xl";
    if (l < 220) return "text-lg md:text-xl";
    if (l < 320) return "text-base md:text-lg";
    return "text-sm md:text-base";
  };

  const renderBack = () => {
    if (card.back === null)
      return (
        <span className="text-lg opacity-60 animate-pulse">Loading...</span>
      );
    if (!isMultiLine) return card.back;
    return card.back.split("\n").map((line, i) => (
      <div key={i} className={line === "" ? "h-2" : undefined}>
        {line}
      </div>
    ));
  };

  return (
    <div
      className="absolute inset-0"
      style={{ perspective: "1200px", ...style }}
    >
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
            className={cn(
              "text-center font-semibold text-white leading-snug w-full px-6",
              getTextSize(card.front ?? ""),
            )}
            style={{
              opacity: textVisible ? 1 : 0,
              transition: `opacity ${TEXT_FADE_OUT_MS}ms ease`,
            }}
          >
            {card.front}
          </div>

          {showHints && <TapZoneHints canGoPrev={canGoPrev} canGoNext={canGoNext} menuOpen={menuOpen} flipColor="text-blue-300/40" />}
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 flex flex-col bg-gradient-to-br from-green-900 to-emerald-950 overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div
            className={cn(
              "font-medium text-white overflow-y-auto scrollbar-none w-full px-6 pt-6",
              isMultiLine
                ? "text-left leading-snug h-full"
                : "text-center leading-relaxed m-auto",
              getTextSize(card.back ?? "", isMultiLine),
            )}
            style={{
              opacity: textVisible ? 1 : 0,
              transition: `opacity ${TEXT_FADE_OUT_MS}ms ease`,
            }}
          >
            {renderBack()}
          </div>

          {showHints && <TapZoneHints canGoPrev={canGoPrev} canGoNext={canGoNext} menuOpen={menuOpen} flipColor="text-green-300/40" />}
        </div>
      </div>
    </div>
  );
};

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
  const [menuOpen, setMenuOpen] = useState(false);
  const animTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = cards.length;
  const card = cards[index];
  const isAnimating = transition !== null;
  const progress = total > 1 ? (index / (total - 1)) * 100 : 100;

  const goTo = useCallback(
    (nextIndex: number, dir: "left" | "right") => {
      if (isAnimating) return;
      setTextVisible(false);
      setTransition({ outgoingIndex: index, dir });
      setIsFlipped(false);
      if (animTimeout.current) clearTimeout(animTimeout.current);
      if (textTimeout.current) clearTimeout(textTimeout.current);
      animTimeout.current = setTimeout(() => {
        setIndex(nextIndex);
        setTransition(null);
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

  const goFirst = useCallback(() => {
    if (index !== 0) goTo(0, "right");
    setMenuOpen(false);
  }, [index, goTo]);

  const goLast = useCallback(() => {
    if (index !== total - 1) goTo(total - 1, "left");
    setMenuOpen(false);
  }, [index, total, goTo]);

  const shuffle = useCallback(() => {
    const next = Math.floor(Math.random() * total);
    if (next !== index) goTo(next, next > index ? "left" : "right");
    setMenuOpen(false);
  }, [index, total, goTo]);

  // Card swipe handlers (only active when menu is closed)
  const cardHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!menuOpen) goNext();
    },
    onSwipedRight: () => {
      if (!menuOpen) goPrev();
    },
    onSwipedUp: () => {
      if (!menuOpen) setMenuOpen(true);
    },
    trackMouse: false,
    trackTouch: true,
    delta: 40,
    preventScrollOnSwipe: true,
  });

  // Drawer swipe-down to close
  const drawerHandlers = useSwipeable({
    onSwipedDown: () => setMenuOpen(false),
    trackMouse: false,
    trackTouch: true,
    delta: 30,
    preventScrollOnSwipe: true,
  });

  // Lock body scroll + fullscreen
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

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menuOpen) setMenuOpen(false);
        else onClose();
      } else if (!menuOpen) {
        if (e.key === "ArrowRight") goNext();
        else if (e.key === "ArrowLeft") goPrev();
        else if (e.key === " " || e.key === "Enter") setIsFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose, menuOpen]);

  useEffect(() => {
    return () => {
      if (animTimeout.current) clearTimeout(animTimeout.current);
      if (textTimeout.current) clearTimeout(textTimeout.current);
    };
  }, []);

  const outgoingExit =
    transition?.dir === "left"
      ? {
          transform: "translateX(-100%)",
          opacity: 0,
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${ANIM_MS}ms ease`,
        }
      : {
          transform: "translateX(100%)",
          opacity: 0,
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${ANIM_MS}ms ease`,
        };

  const incomingEnter =
    transition?.dir === "left"
      ? {
          animation: `mobile-card-enter-right ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) both`,
        }
      : {
          animation: `mobile-card-enter-left ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) both`,
        };

  // Card slides up 25% when menu open
  const cardAreaStyle: React.CSSProperties = {
    transform: menuOpen ? "translateY(-28%)" : "translateY(0)",
    transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 select-none shrink-0">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="p-1.5 rounded-full text-white/60 hover:text-white disabled:opacity-20 transition-opacity"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-white/70 text-xs font-medium">
            {index + 1} / {total}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(total, 11) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i === index % 11
                    ? "w-4 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/25",
                )}
              />
            ))}
            {total > 11 && (
              <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-white/60 hover:text-white transition-opacity"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Card area — slides up when menu open */}
      <div
        {...cardHandlers}
        className="flex-1 relative overflow-visible select-none"
        style={cardAreaStyle}
        onClick={(e) => {
          if (menuOpen) { setMenuOpen(false); return; }
          if (isAnimating) return;
          const { clientX, currentTarget } = e;
          const { left, width } = currentTarget.getBoundingClientRect();
          const relX = (clientX - left) / width;
          if (relX < 0.2) goPrev();
          else if (relX > 0.8) goNext();
          else setIsFlipped((f) => !f);
        }}
      >
        {transition && (
          <CardSlide
            card={cards[transition.outgoingIndex]}
            isFlipped={false}
            style={outgoingExit}
            canGoPrev={transition.outgoingIndex > 0}
            canGoNext={transition.outgoingIndex < total - 1}
            menuOpen={menuOpen}
          />
        )}
        <CardSlide
          card={card}
          isFlipped={isFlipped}
          style={transition ? incomingEnter : undefined}
          showHints
          canGoPrev={index > 0}
          canGoNext={index < total - 1}
          textVisible={textVisible}
          menuOpen={menuOpen}
        />
      </div>

      {/* Bottom action drawer */}
      <div
        {...drawerHandlers}
        className="absolute bottom-0 left-0 right-0 z-10"
        style={{
          transform: menuOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Scrim tap-to-close strip above drawer */}
        <div
          className="h-8 cursor-pointer"
          onClick={() => setMenuOpen(false)}
        />

        <div className="bg-zinc-900 border-t border-white/10 rounded-t-3xl pb-safe">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <GripHorizontal className="h-5 w-5 text-white/40" />
          </div>

          {/* Progress bar */}
          <div className="px-5 pb-3">
            <div className="flex justify-between text-[10px] text-white/50 mb-1">
              <span>Card {index + 1}</span>
              <span>{Math.round(progress)}% through</span>
              <span>{total} total</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Action grid */}
          <div className="grid grid-cols-3 gap-px bg-white/5 border-t border-white/5">
            <ActionButton
              icon={<SkipBack className="h-5 w-5" />}
              label="First Card"
              onClick={goFirst}
              disabled={index === 0}
            />
            <ActionButton
              icon={<RotateCcw className="h-5 w-5" />}
              label="Flip Back"
              onClick={() => {
                setIsFlipped(false);
                setMenuOpen(false);
              }}
              disabled={!isFlipped}
            />
            <ActionButton
              icon={<SkipForward className="h-5 w-5" />}
              label="Last Card"
              onClick={goLast}
              disabled={index === total - 1}
            />
            <ActionButton
              icon={<ChevronLeft className="h-5 w-5" />}
              label="Previous"
              onClick={() => {
                goPrev();
                setMenuOpen(false);
              }}
              disabled={index === 0}
            />
            <ActionButton
              icon={<Shuffle className="h-5 w-5" />}
              label="Random"
              onClick={shuffle}
            />
            <ActionButton
              icon={<ChevronRight className="h-5 w-5" />}
              label="Next"
              onClick={() => {
                goNext();
                setMenuOpen(false);
              }}
              disabled={index === total - 1}
            />
          </div>

          {/* Exit row */}
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-4 text-red-400/70 hover:text-red-400 transition-colors border-t border-white/5"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Exit Flash Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  disabled,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center justify-center gap-1 py-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-25 transition-colors"
  >
    <span className="text-white/70">{icon}</span>
    <span className="text-[10px] text-white/50">{label}</span>
  </button>
);

export default FlashcardMobileView;
