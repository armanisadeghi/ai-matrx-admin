/**
 * MicrophoneIconButton
 *
 * Ultra-thin client shell. On initial render this is JUST a Mic icon — no hooks,
 * no audio logic, no permission checks, zero extra bundle weight.
 *
 * On first user engagement (click) it:
 *   1. Renders a pure-CSS loading spinner on the icon (no JS executed yet)
 *   2. Dynamically imports MicrophoneIconButtonCore (code-split chunk)
 *   3. Mounts the core which auto-starts recording and handles everything else
 *
 * Props:
 *   onTranscriptionComplete  — required; called with the final text string
 *   variant                  — 'icon-only' | 'inline-expand' | 'modal-controls'
 *   size                     — 'sm' | 'md' | 'lg'
 *   className                — forwarded to the icon button
 *   disabled                 — prevents engagement
 *
 * @official-component
 */

'use client';

import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MicVariant = 'icon-only' | 'inline-expand' | 'modal-controls';

export interface MicrophoneIconButtonProps {
  onTranscriptionComplete: (text: string) => void;
  onLiveTranscript?: (text: string) => void;
  onError?: (error: string, code?: string) => void;
  variant?: MicVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

// ── Size maps (static — no imports needed) ───────────────────────────────────
const buttonSizeMap = { sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-9 w-9' } as const;
const iconSizeMap   = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' } as const;

// ── Lazy-loaded core — zero cost until first engagement ───────────────────────
const MicrophoneIconButtonCore = lazy(() => import('./MicrophoneIconButtonCore'));

// ── Pure-CSS loading state shown while the chunk is fetching ─────────────────
function MicLoadingFallback({
  size,
  className,
}: {
  size: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full',
        buttonSizeMap[size],
        className,
      )}
      title="Loading…"
      aria-label="Loading voice recorder"
    >
      <Mic className={cn(iconSizeMap[size], 'text-muted-foreground')} />
      {/* CSS-only spinner ring — no JS needed */}
      <span
        className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"
        style={{ animationDuration: '0.75s' }}
      />
    </div>
  );
}

// ── Shell component ───────────────────────────────────────────────────────────
export function MicrophoneIconButton({
  onTranscriptionComplete,
  onLiveTranscript,
  onError,
  variant = 'icon-only',
  size = 'md',
  className,
  disabled = false,
}: MicrophoneIconButtonProps) {
  const [engaged, setEngaged] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled) setEngaged(true);
  }, [disabled]);

  // ── Before engagement: just an icon, nothing more ────────────────────────
  if (!engaged) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title="Start recording"
        aria-label="Start voice recording"
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'transition-colors hover:bg-accent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          buttonSizeMap[size],
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
      >
        <Mic className={cn(iconSizeMap[size], 'text-muted-foreground')} />
      </button>
    );
  }

  // ── After engagement: lazy-load the full core ─────────────────────────────
  return (
    <Suspense fallback={<MicLoadingFallback size={size} className={className} />}>
      <MicrophoneIconButtonCore
        onTranscriptionComplete={onTranscriptionComplete}
        onLiveTranscript={onLiveTranscript}
        onError={onError}
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        autoStart={true}
      />
    </Suspense>
  );
}
