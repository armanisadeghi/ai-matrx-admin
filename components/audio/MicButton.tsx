"use client";

// components/audio/MicButton.tsx
//
// THE mic of every writing box (ProInput / ProTextarea): one round button that
// starts and stops voice input. There is NO device chevron (Arman, 2026-10-16):
// choosing a microphone is a right-click or a press-and-hold on the mic itself,
// which opens the device picker anchored to it — and wherever the field shows
// its "…" menu, that menu carries an "Audio settings" row too.

import { useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@ai-matrx/design-system";
import { useLongPress } from "@ai-matrx/kit/hooks";
import { cn } from "@/lib/utils";
import {
  MicDeviceMenuPanel,
  useMicDevicePicker,
} from "@/components/audio/micDeviceMenuShared";

/** How long a press must last before it opens the device picker instead of toggling voice. */
export const MIC_LONG_PRESS_MS = 500;

// Plain ink, no glass border: the hosts pair it with a transparent "…" tap
// button, so the row is all non-glass (tap-target placement rule 2). The glyph
// matches the tap buttons beside it (16px at full ink, Arman 2026-10-09). On a
// touch screen an invisible strip grows the hit area to 44px tall without
// growing the layout (the tap-target system's own trick); the iOS long-press
// callout and text selection are off so the hold reaches the picker.
const BUTTON =
  "relative z-[1] inline-flex h-full touch-manipulation select-none items-center justify-center rounded-full transition-colors [-webkit-touch-callout:none] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 " +
  "hover:bg-muted/60 active:bg-muted-foreground/15 " +
  "pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-1 pointer-coarse:before:content-['']";

export interface MicButtonProps {
  onMicClick: () => void;
  disabled?: boolean;
  isRecording?: boolean;
  isTranscribing?: boolean;
  audioLevel?: number;
  micAriaLabel?: string;
  iconClassName?: string;
  tabIndex?: number;
  /**
   * The host field is shorter than a tap box (`isDenseField`): the button
   * shrinks to 24px with a 14px glyph so it never sticks out of the field.
   */
  dense?: boolean;
}

export function MicButton({
  onMicClick,
  disabled,
  isRecording = false,
  isTranscribing = false,
  audioLevel = 0,
  micAriaLabel = "Start voice input",
  iconClassName,
  tabIndex,
  dense = false,
}: MicButtonProps) {
  const { handleOpenChange, openSettings } = useMicDevicePicker();
  const [pickerOpen, setPickerOpen] = useState(false);
  // A hold that opened the picker must not ALSO toggle voice on release.
  const heldRef = useRef(false);

  const openPicker = () => {
    if (disabled) return;
    setPickerOpen(true);
    handleOpenChange(true);
  };
  const longPress = useLongPress(
    () => {
      heldRef.current = true;
      openPicker();
    },
    {
      threshold: MIC_LONG_PRESS_MS,
      // Every press starts clean: a hold whose release fired no click must
      // not swallow the next real tap.
      onStart: () => {
        heldRef.current = false;
      },
    },
  );

  const micLabel = isRecording
    ? "Stop recording"
    : isTranscribing
      ? "Transcribing"
      : micAriaLabel;

  const stateColor = isRecording
    ? "text-primary"
    : isTranscribing
      ? "text-blue-600 dark:text-blue-400"
      : "text-muted-foreground";

  return (
    <div
      className={cn(
        "relative mx-[3px] inline-flex shrink-0 items-center",
        dense ? "h-6" : "h-7 pointer-coarse:h-10",
      )}
    >
      <Popover
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          handleOpenChange(open);
        }}
      >
        <PopoverAnchor asChild>
          <div
            className={cn(
              "relative flex items-stretch rounded-full",
              dense ? "h-6" : "h-7 pointer-coarse:h-9",
            )}
          >
            {isRecording && (
              <>
                <span
                  className="pointer-events-none absolute inset-0 rounded-full bg-primary/20 animate-ping"
                  style={{ animationDuration: "1.5s" }}
                />
                <span
                  className="pointer-events-none absolute inset-0 rounded-full bg-primary/15"
                  style={{
                    transform: `scale(${1 + audioLevel / 200})`,
                    transition: "transform 75ms",
                  }}
                />
              </>
            )}

            <button
              {...longPress}
              tabIndex={tabIndex}
              type="button"
              onClick={() => {
                if (heldRef.current) {
                  heldRef.current = false;
                  return;
                }
                onMicClick();
              }}
              onContextMenu={(e) => {
                // The mic's own menu: never the field's right-click menu or the browser's.
                e.preventDefault();
                e.stopPropagation();
                openPicker();
              }}
              disabled={disabled}
              aria-label={micLabel}
              aria-haspopup="dialog"
              title={`${micLabel} · right-click or hold to choose a microphone`}
              className={cn(
                BUTTON,
                dense ? "px-1" : "px-1.5 pointer-coarse:px-3",
                stateColor,
                iconClassName,
              )}
            >
              {isTranscribing && !isRecording ? (
                <Loader2 className={cn(dense ? "h-3.5 w-3.5" : "h-4 w-4", "animate-spin")} />
              ) : (
                <Mic className={dense ? "h-3.5 w-3.5" : "h-4 w-4"} />
              )}
            </button>
          </div>
        </PopoverAnchor>
        <PopoverContent
          sizing="content"
          align="end"
          side="bottom"
          sideOffset={6}
          className="p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <MicDeviceMenuPanel
            onOpenSettings={() => {
              setPickerOpen(false);
              openSettings();
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
