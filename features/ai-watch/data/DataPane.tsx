"use client";

/**
 * DataPane — the ONE place the Watch AI Data section shows a value. Every pane names its tier
 * (RAW · SENT TO MODEL · PASSED ON · DISPLAY) and its size in the title, so nothing on screen is
 * data without saying which data it is. Guard: `pnpm check:ai-watch` (a data value rendered outside
 * a DataPane in `features/ai-watch/data/`, or a DataPane without a `tier`, fails).
 */

import { useClipboard } from "@ai-matrx/kit/clipboard";
import { Copy } from "lucide-react";
import { cn } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { DATA_TIERS, type DataTier } from "./raw-data";

export interface DataPaneProps {
  tier: DataTier;
  /** What this copy is ("Tool result as returned", "Iteration 2"). */
  title: string;
  /** "3,796 chars" — always present; "size unknown" when the server did not say. */
  size: string;
  /** A string is shown and copied verbatim; anything else as JSON (marked as a formatted view). */
  value?: unknown;
  /** Rendered instead of a value (the DISPLAY tier's renderer, a "not kept" line, a file door). */
  children?: React.ReactNode;
  open?: boolean;
  /** One short line under the title (where it came from). */
  note?: string | null;
  /** Told when the person opens or closes the pane (a stored answer loads on first open). */
  onToggle?: (open: boolean) => void;
}

export function DataPane({ tier, title, size, value, children, open = false, note, onToggle }: DataPaneProps) {
  const { copyText } = useClipboard({ notify: copyNotify });
  const verbatim = typeof value === "string";
  const text = value === undefined ? null : verbatim ? (value as string) : JSON.stringify(value, null, 2);
  return (
    <details
      open={open}
      className="rounded border border-border"
      data-ai-watch-tier={tier}
      onToggle={onToggle ? (e) => onToggle(e.currentTarget.open) : undefined}
    >
      <summary className="flex select-none items-center gap-2 px-2 py-1">
        <span
          className={cn(
            "shrink-0 rounded px-1 font-mono text-[10px] font-semibold",
            tier === "raw" ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground",
          )}
        >
          {DATA_TIERS[tier]}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        <span className="shrink-0 text-muted-foreground">{size}</span>
        {text != null ? (
          <Button
            variant="quiet"
            icon={<Copy />}
            aria-label={`Copy ${DATA_TIERS[tier]}`}
            title={`Copy ${DATA_TIERS[tier]} exactly as shown`}
            className="shrink-0"
            onClick={(e) => {
              e.preventDefault();
              void copyText(text, `${DATA_TIERS[tier]} copied`, "Copy failed");
            }}
          />
        ) : null}
      </summary>
      {note ? <div className="border-t border-border px-2 py-0.5 text-muted-foreground">{note}</div> : null}
      {text != null ? (
        <>
          {!verbatim ? (
            <div className="border-t border-border px-2 py-0.5 text-muted-foreground">Formatted view</div>
          ) : null}
          <pre
            data-kind-source="explicit"
            className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words border-t border-border p-2 font-mono text-[11px]"
          >
            {text}
          </pre>
        </>
      ) : null}
      {children ? <div className="border-t border-border p-2">{children}</div> : null}
    </details>
  );
}
