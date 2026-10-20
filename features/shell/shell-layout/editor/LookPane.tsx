"use client";

// features/shell/shell-layout/editor/LookPane.tsx — choose the Layout's Look (custom-experience, 2026-10-20).
// One card per registered look (../looks.ts), each with a small preview drawn by the look's OWN rules (the
// preview tiles carry the same `data-look-tile` attribute the sidebar does), so the preview cannot drift from
// what the shell will show. Used by the layout editor's Look tab and by Settings › Layout.
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHELL_LOOKS, type ShellLookDef, type ShellLookId } from "../looks";

const PREVIEW_ROWS = 6;

function LookPreview({ look }: { look: ShellLookDef }) {
  const tinted = look.id !== "standard";
  return (
    <span
      aria-hidden="true"
      className="flex h-20 w-full overflow-hidden rounded-md border border-border bg-background"
      {...(tinted ? { "data-shell-look": look.id } : {})}
    >
      <span className="flex w-7 shrink-0 flex-col items-center gap-1.5 border-r border-border py-2">
        {Array.from({ length: PREVIEW_ROWS }, (_, i) => (
          <span
            key={i}
            className={cn("block size-3.5 rounded-[4px]", tinted ? "" : "border border-muted-foreground")}
            {...(tinted ? { "data-look-tile": look.id, style: { "--look-hue": look.preview[i % look.preview.length] } as React.CSSProperties } : {})}
          />
        ))}
      </span>
      <span
        className="relative flex flex-1 flex-col gap-1.5 p-2"
        style={tinted ? { backgroundImage: "var(--look-canvas-glow)", backgroundRepeat: "no-repeat" } : undefined}
      >
        <span className="block h-2 w-1/2 rounded-sm bg-muted" />
        <span className="mt-auto grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("block h-6 border border-border bg-card", tinted ? "rounded-md" : "rounded-sm")} />
          ))}
        </span>
      </span>
    </span>
  );
}

export function LookPane({ value, onChange, disabled }: { value: ShellLookId; onChange: (id: ShellLookId) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Look" className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
      {SHELL_LOOKS.map((look) => {
        const on = look.id === value;
        return (
          <button
            key={look.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            data-clickable
            onClick={() => onChange(look.id)}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "border-primary" : "border-border hover:border-muted-foreground",
            )}
          >
            <LookPreview look={look} />
            <span className="flex items-center gap-1.5 px-0.5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{look.label}</span>
                <span className="block truncate type-secondary text-muted-foreground">{look.hint}</span>
              </span>
              {on ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
