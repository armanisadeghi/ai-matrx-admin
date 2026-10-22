"use client";

/**
 * SizedTitleInput — a record's rename field for a host's title slot (a Board tile header).
 *
 * It is exactly as wide as its text (up to the slot), so the rest of the host header stays empty and
 * keeps dragging the tile. A hidden mirror of the value (same font, same padding) gives the wrapper
 * its width; the input fills that wrapper. Same technique as `NoteTitleField` and `EditorTitleField`
 * (CSS `field-sizing` measured short inside a scaled tile). Every record that moves a plain
 * input into the title slot (`HostTitle`) uses this; the editor-style title (`EditorTitleField`)
 * already sizes the same way.
 */

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SizedTitleInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "size"> {
  value: string;
  /** Sizes the wrapper (max width, shrink). */
  wrapperClassName?: string;
}

export function SizedTitleInput({ value, placeholder, className, wrapperClassName, ...rest }: SizedTitleInputProps) {
  return (
    <span
      data-sized-title=""
      className={cn("inline-grid min-w-[3rem] max-w-full shrink grid-cols-[minmax(0,1fr)]", wrapperClassName)}
    >
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre px-1 pr-2 text-sm font-medium"
      >
        {value || placeholder || " "}
      </span>
      {/* ui-exception: a title edited in place in a tile header, not a form field. */}
      <input
        {...rest}
        value={value}
        placeholder={placeholder}
        size={1}
        className={cn(
          "col-start-1 row-start-1 w-full min-w-0 truncate rounded-sm border-none bg-transparent px-1 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground hover:bg-accent/50 focus:ring-1 focus:ring-ring",
          className,
        )}
      />
    </span>
  );
}
