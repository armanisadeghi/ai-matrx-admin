// ============================================================================
// INLINE STATUS INDICATOR — transient shimmer label for phase/info events.
// Automatically removed from the segment list when real content supersedes it.
// ============================================================================

export interface InlineStatusIndicatorProps {
  label: string;
}

export const InlineStatusIndicator: React.FC<InlineStatusIndicatorProps> = ({
  label,
}) => (
  <div className="flex items-center gap-2 py-2">
    <span
      className="inline-block text-sm bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer"
      style={{
        backgroundImage:
          "linear-gradient(90deg, hsl(var(--muted-foreground) / 0.3) 0%, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground) / 0.3) 100%)",
      }}
    >
      {label}
    </span>
  </div>
);
