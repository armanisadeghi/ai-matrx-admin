'use client';

import React, { useState, useCallback } from 'react';
import { MicrophoneIconButton, MicVariant } from '@/features/audio/components/MicrophoneIconButton';

// ── Variant descriptions ──────────────────────────────────────────────────────
const VARIANTS: Array<{
  id: MicVariant;
  label: string;
  badge: string;
  description: string;
  detail: string;
}> = [
  {
    id: 'icon-only',
    label: 'Icon Only',
    badge: 'Fixed footprint',
    description:
      'Renders as a single icon at all times. State is communicated entirely through icon glyph, color, and animation — the button never changes size or shifts surrounding layout.',
    detail:
      'Ideal for toolbars, table cells, tight layouts, or anywhere that needs a zero-impact mic trigger.',
  },
  {
    id: 'inline-expand',
    label: 'Inline Expand',
    badge: 'Expands on recording',
    description:
      'Starts as a mic icon. While recording it expands inline to show a real-time audio level indicator, duration timer, and a Stop button. Returns to icon size after transcription.',
    detail:
      'Ideal for input areas, search bars, or chat interfaces where visual recording feedback helps the user.',
  },
  {
    id: 'modal-controls',
    label: 'Modal Controls',
    badge: 'Fixed footprint + modal',
    description:
      'Always renders as a single icon. Clicking opens a centered modal that hosts the entire recording experience — recording controls, audio levels, and post-transcription review.',
    detail:
      'Ideal when you want rich recording UI without any impact on the triggering layout, or when text review before acceptance is important.',
  },
];

// ── Per-variant result card ───────────────────────────────────────────────────
interface HistoryEntry {
  id: number;
  text: string;
  time: string;
}

function VariantTestCard({
  id,
  label,
  badge,
  description,
  detail,
}: (typeof VARIANTS)[number]) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleTranscription = useCallback((t: string) => {
    setHistory(prev => [
      { id: Date.now(), text: t, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
    setLiveText('');
    setError(null);
  }, []);

  const handleError = useCallback((e: string) => {
    setError(e);
    setLiveText('');
  }, []);

  // For inline-expand we need a freely-growing row, not a fixed box
  const TriggerArea = id === 'inline-expand' ? (
    <div className="flex items-center gap-3 min-w-0 w-full rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="text-xs text-muted-foreground shrink-0">Search or speak…</span>
      <div className="flex-1" />
      {/* Component can expand freely to the right */}
      <MicrophoneIconButton
        variant={id}
        onTranscriptionComplete={handleTranscription}
        onError={handleError}
        size="md"
      />
    </div>
  ) : (
    <div className="flex items-center gap-4">
      {/* Fixed-size container proves icon footprint never changes */}
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full border border-dashed border-border overflow-visible">
        <MicrophoneIconButton
          variant={id}
          onTranscriptionComplete={handleTranscription}
          onError={handleError}
          size="md"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {id === 'icon-only'
          ? 'The dashed box is always 40 × 40 px — the icon footprint never changes.'
          : 'The dashed box stays 40 × 40 px. All recording interaction happens in the modal.'}
      </p>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold">{label}</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {badge}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-xs text-muted-foreground/60 italic">{detail}</p>
        </div>
      </div>

      {/* Interactive area */}
      <div className="px-5 py-5 flex flex-col gap-4">
        {TriggerArea}

        <hr className="border-border" />

        {/* History / result */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Transcription History
            </p>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="mb-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 px-3 py-2">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Live preview — chunked results appear here before final callback */}
          {liveText && (
            <div className="mb-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Live transcript</p>
              </div>
              <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-200">{liveText}</p>
            </div>
          )}

          {history.length === 0 && !error && !liveText && (
            <p className="text-sm text-muted-foreground/50 italic">
              Each recording will be appended as a new entry here.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 px-3 py-2 flex gap-3"
              >
                <span className="text-xs text-muted-foreground/50 tabular-nums shrink-0 mt-0.5">
                  {entry.time}
                </span>
                <p className="text-sm leading-relaxed text-green-800 dark:text-green-300">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bundle verification note ──────────────────────────────────────────────────
function BundleNote() {
  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-4 py-3 text-sm">
      <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">
        Verifying zero initial overhead
      </p>
      <ul className="space-y-1 text-blue-700 dark:text-blue-400 text-xs list-disc list-inside">
        <li>
          Open DevTools → Network → reload and filter by JS. You should see{' '}
          <strong>no audio-related chunk</strong> loaded until a mic icon is clicked.
        </li>
        <li>
          Open DevTools → Sources. Search for{' '}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">useChunkedRecordAndTranscribe</code>.
          It should not be in the initial bundle.
        </li>
        <li>
          Click any mic icon. Only then will a new JS chunk load — the{' '}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">MicrophoneIconButtonCore</code>{' '}
          chunk. The browser permission prompt fires only after that chunk executes.
        </li>
      </ul>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MicrophoneIconButtonTestPage() {
  return (
    <div className="h-full overflow-y-auto bg-textured">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">MicrophoneIconButton</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A self-contained mic trigger with three layout variants. All state management,
            error handling, and permission logic live inside — callers only receive
            the final transcribed text string.
          </p>
        </div>

        <BundleNote />

        {/* One card per variant */}
        {VARIANTS.map((v) => (
          <VariantTestCard key={v.id} {...v} />
        ))}

        {/* Usage snippet */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium">Minimal usage</p>
          </div>
          <pre className="px-5 py-4 text-xs overflow-x-auto text-muted-foreground leading-relaxed">
{`import { MicrophoneIconButton } from '@/features/audio/components';

// icon-only (default) — fits anywhere, zero layout impact
<MicrophoneIconButton
  onTranscriptionComplete={(text) => setValue(text)}
/>

// inline-expand — shows recording feedback inline
<MicrophoneIconButton
  variant="inline-expand"
  onTranscriptionComplete={(text) => setValue(text)}
/>

// modal-controls — full recording UI in a centered modal
<MicrophoneIconButton
  variant="modal-controls"
  onTranscriptionComplete={(text) => setValue(text)}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
