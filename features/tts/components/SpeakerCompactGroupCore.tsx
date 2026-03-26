/**
 * SpeakerCompactGroupCore — Variant 3: 2-button group (Play/Pause toggle + Stop)
 *
 * Both buttons permanently rendered inside TapTargetButtonGroup.
 * Uses PlayTapButton / PauseTapButton / StopTapButton from tap-buttons.
 * Shape never changes. Unavailable actions are disabled.
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { PlayTapButton, PauseTapButton, StopTapButton } from '@/components/icons/tap-buttons';
import { TapTargetButtonGroup } from '@/app/(ssr)/_components/core/TapTargetButton';
import { useCartesiaSpeaker } from '../hooks/useCartesiaSpeaker';

interface Props {
  text: string;
  processMarkdown?: boolean;
  autoStart?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function SpeakerCompactGroupCore({
  text,
  processMarkdown = true,
  autoStart = false,
  disabled = false,
}: Props) {
  const { isLoading, isPlaying, isPaused, speak, pause, resume, stop } =
    useCartesiaSpeaker({ processMarkdown });

  const autoStartFired = useRef(false);

  useEffect(() => {
    if (!autoStart || autoStartFired.current) return;
    autoStartFired.current = true;
    speak(text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = useCallback(async () => {
    if (isPlaying) await pause();
    else if (isPaused) await resume();
    else await speak(text);
  }, [isPlaying, isPaused, text, speak, pause, resume]);

  const toggleDisabled = disabled || isLoading;
  const stopDisabled = disabled || (!isPlaying && !isPaused);

  const ToggleButton = isPlaying ? PauseTapButton : PlayTapButton;

  return (
    <TapTargetButtonGroup>
      <ToggleButton
        variant="group"
        onClick={handleToggle}
        disabled={toggleDisabled}
        ariaLabel={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
      />
      <StopTapButton
        variant="group"
        onClick={stop}
        disabled={stopDisabled}
        ariaLabel="Stop"
      />
    </TapTargetButtonGroup>
  );
}
