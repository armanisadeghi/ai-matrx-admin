"use client";

import * as React from "react";
import { Checkbox as UiCheckbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type LegacyOnChange = React.ChangeEventHandler<HTMLInputElement> | (() => void);

/** Scraper feature checkbox — shadcn-backed, full row (label + control) clickable. */
export function Checkbox({
  checked,
  onChange,
  label,
  className,
  disabled,
  ...rest
}: {
  checked?: boolean;
  onChange?: LegacyOnChange;
  label?: React.ReactNode;
} & Omit<
  React.ComponentPropsWithoutRef<typeof UiCheckbox>,
  "checked" | "onCheckedChange"
>) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <UiCheckbox
        checked={!!checked}
        disabled={disabled}
        onCheckedChange={() => {
          if (!onChange) return;
          (onChange as (e?: React.ChangeEvent<HTMLInputElement>) => void)();
        }}
        className={className}
        {...rest}
      />
      {label ? (
        <span className="text-gray-800 dark:text-gray-200">{label}</span>
      ) : null}
    </label>
  );
}
