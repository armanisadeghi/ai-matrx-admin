"use client";

import React, { useState, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { noErrors } from "@/utils/utils";

const defaultSizes = {
  width: "w-48",
  height: "h-16",
} as const;

interface LightSwitchToggleProps {
  variant?: "rounded" | "geometric" | string;
  defaultValue?: boolean;
  value?: boolean;
  onChange?: (value: boolean) => void;
  width?: string;
  height?: string;
  labels?: {
    on: string;
    off: string;
  };
  disabled?: boolean;
  className?: string;
}

const LightSwitchToggle = forwardRef<any, LightSwitchToggleProps>(
  (
    {
      variant,
      defaultValue = false,
      value,
      onChange,
      width,
      height,
      labels = { on: "ON", off: "OFF" },
      disabled = false,
      className,
    }: LightSwitchToggleProps,
    ref,
  ) => {
    const [internalState, setInternalState] = useState(defaultValue);
    const validVariant = noErrors(variant, "rounded", ["rounded", "geometric"]);

    const isOn = value !== undefined ? value : internalState;

    const handleToggle = (newState: boolean) => {
      if (disabled) return;
      if (value === undefined) {
        setInternalState(newState);
      }
      onChange?.(newState);
    };

    const containerClasses = cn(
      "relative flex bg-muted shadow-inner overflow-hidden",
      width || defaultSizes.width,
      height || defaultSizes.height,
      validVariant === "rounded" && "rounded-full",
      disabled && "opacity-50 cursor-not-allowed",
      className,
    );

    const buttonBaseClasses =
      "relative w-1/2 h-full transition-all duration-300";
    const activeButtonClasses =
      "bg-primary transform -translate-y-px shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]";
    const inactiveButtonClasses = "bg-muted/60 transform -translate-y-1.5";

    const renderOption = (
      isActive: boolean,
      label: string,
      side: "left" | "right",
      onClick: () => void,
    ) => (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={isActive}
        className={cn(
          buttonBaseClasses,
          isActive ? activeButtonClasses : inactiveButtonClasses,
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            side === "left"
              ? "border-r border-border"
              : "border-l border-border",
            validVariant === "rounded" &&
              (side === "left" ? "rounded-l-full" : "rounded-r-full"),
            isActive
              ? "bg-gradient-to-br from-primary/90 via-primary to-primary/90"
              : "bg-gradient-to-br from-muted/70 via-muted/50 to-muted/70 dark:from-muted/40 dark:via-muted/30 dark:to-muted/40",
          )}
        />
        <span
          className={cn(
            "relative z-20 font-semibold text-xs truncate px-1 transition-colors",
            isActive ? "text-primary-foreground" : "text-muted-foreground/50",
          )}
        >
          {label}
        </span>
      </button>
    );

    return (
      <div className="flex items-center justify-center">
        <div ref={ref} className={containerClasses}>
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-border transform -translate-x-1/2 z-10" />
          {renderOption(!isOn, labels.off, "left", () => handleToggle(false))}
          {renderOption(isOn, labels.on, "right", () => handleToggle(true))}
        </div>
      </div>
    );
  },
);

LightSwitchToggle.displayName = "LightSwitchToggle";

export default LightSwitchToggle;
