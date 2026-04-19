/**
 * StreamingSpeakerLive
 *
 * The "live" part of the speaker — everything that needs the Cartesia SDK,
 * the streaming hook, and real audio state. Designed to live behind a
 * dynamic import in the lightweight shell (StreamingSpeakerButton), so the
 * SDK chunk only ships when the user actually clicks play.
 *
 * First render state: because the hook is initialised with `initialLoading: true`,
 * the very first frame rendered by this component is the disabled "Connecting…"
 * icon — exactly matching the placeholder the shell shows while the dynamic
 * chunk is fetching. That means the DOM transition from "shell's placeholder"
 * to "this component's first render" is visually a no-op: same button, same
 * variant, same disabled/aria state. No flicker.
 *
 * On mount we auto-call speak(text) once. Subsequent clicks toggle play/pause
 * via the hook's own controls.
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Volume2TapButton, PauseTapButton } from '@/components/icons/tap-buttons';
import { useCartesiaStreamingSpeaker } from '../hooks/useCartesiaStreamingSpeaker';
import type { SpeakerVariant } from '../types';

export interface StreamingSpeakerLiveProps {
  text: string;
  processMarkdown?: boolean;
  variant?: SpeakerVariant;
  className?: string;
  disabled?: boolean;
}

export function StreamingSpeakerLive({
  text,
  processMarkdown = true,
  variant,
  className,
  disabled = false,
}: StreamingSpeakerLiveProps) {
  const { isLoading, isPlaying, isPaused, speak, pause, resume } =
    useCartesiaStreamingSpeaker({ processMarkdown, initialLoading: true });

  const autoStartFired = useRef(false);

  useEffect(() => {
    if (autoStartFired.current) return;
    autoStartFired.current = true;
    speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled || isLoading) return;
    if (isPlaying) await pause();
    else if (isPaused) await resume();
    else await speak(text);
  }, [disabled, isLoading, isPlaying, isPaused, text, speak, pause, resume]);

  if (isPlaying) {
    return (
      <PauseTapButton
        variant={variant}
        onClick={handleClick}
        disabled={disabled}
        ariaLabel="Pause"
        className={className}
      />
    );
  }

  return (
    <Volume2TapButton
      variant={variant}
      onClick={handleClick}
      disabled={disabled || isLoading}
      ariaLabel={isLoading ? 'Connecting…' : isPaused ? 'Resume' : 'Play audio'}
      className={className}
    />
  );
}

export default StreamingSpeakerLive;
