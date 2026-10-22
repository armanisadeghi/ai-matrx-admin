"use client";

// features/flashcards/fast-fire/voice-test/VoiceTestButton.tsx
//
// Drop-anywhere "Test me" button — the single entry point for the single-card
// voice test. Give it a card (+ optional cached spoken-front) and it owns the
// dialog. This is what goes on ANY flashcard surface: the study deck, deck detail,
// chat flashcard blocks, window panels. One import, no wiring.

import { useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MicTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { CardVoiceTestDialog } from "./CardVoiceTestDialog";

export interface VoiceTestButtonProps {
  card: { id: string; front: string; back: string };
  spokenFrontFileId?: string | null;
  answerSeconds?: number;
  label?: string;
  /** Compact mic icon — for embedding on flashcard corners. */
  iconOnly?: boolean;
  variant?: "primary" | "outline" | "quiet";
  className?: string;
}

export function VoiceTestButton({
  card,
  spokenFrontFileId,
  answerSeconds,
  label = "Test me",
  iconOnly = false,
  variant = "outline",
  className,
}: VoiceTestButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);

  return (
    <>
      {iconOnly ? (
        <MicTapButton
          variant="transparent"
          ariaLabel={label}
          tooltip={label}
          onClick={handleOpen}
        />
      ) : (
        <Button
          type="button"
          variant={variant}
          icon={<Mic />}
          className={className}
          title={label}
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
        >
          {label}
        </Button>
      )}
      <CardVoiceTestDialog
        card={card}
        spokenFrontFileId={spokenFrontFileId}
        answerSeconds={answerSeconds}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
