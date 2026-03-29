"use client";

import { Loader2 } from "lucide-react";
import { TapTargetButtonSolid } from "@/components/icons/TapTargetButton";
import { ArrowUpTapButton } from "@/components/icons/tap-buttons";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";

interface InputActionButtonsProps {
  /** Show the voice mic button */
  showVoice: boolean;
  /** Called when transcription finishes — append the result to the input */
  onTranscriptionComplete: (text: string) => void;
  isExecuting: boolean;
  isDisabled: boolean;
  isUploading: boolean;
  sendButtonVariant: "gray" | "blue" | "default";
  onSubmit: () => void;
}

export function InputActionButtons({
  showVoice,
  onTranscriptionComplete,
  isExecuting,
  isDisabled,
  isUploading,
  sendButtonVariant,
  onSubmit,
}: InputActionButtonsProps) {
  const bgColor = sendButtonVariant === "gray" ? "bg-muted" : "bg-blue-600";
  const hoverBgColor =
    sendButtonVariant === "gray" ? "hover:bg-muted/80" : "hover:bg-blue-700";
  const iconColor =
    sendButtonVariant === "gray" ? "text-foreground" : "text-white";

  return (
    <div className="flex items-center">
      {showVoice && (
        <MicrophoneIconButton
          variant="icon-only"
          size="md"
          onTranscriptionComplete={onTranscriptionComplete}
        />
      )}

      {isExecuting ? (
        <TapTargetButtonSolid
          ariaLabel="Sending..."
          bgColor={bgColor}
          hoverBgColor={hoverBgColor}
          iconColor={iconColor}
          icon={<Loader2 className="w-4 h-4 animate-spin" />}
        />
      ) : (
        <ArrowUpTapButton
          variant="solid"
          onClick={onSubmit}
          disabled={isDisabled || isUploading}
          ariaLabel="Send message"
          bgColor={bgColor}
          hoverBgColor={hoverBgColor}
          iconColor={iconColor}
        />
      )}
    </div>
  );
}
