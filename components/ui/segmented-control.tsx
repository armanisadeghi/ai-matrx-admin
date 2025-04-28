"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SegmentOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps {
  value: string;
  onValueChange: (value: string) => void;
  data: SegmentOption[];
  name?: string;
  className?: string;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

export function SegmentedControl({
  value,
  onValueChange,
  data,
  name,
  className,
  fullWidth = false,
  size = "md",
}: SegmentedControlProps) {
  // Handle size classes
  const sizeClasses = {
    sm: "h-7 text-xs",
    md: "h-9 text-sm",
    lg: "h-10 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex p-0.5 bg-muted rounded-md",
        fullWidth && "w-full",
        className
      )}
      role="tablist"
    >
      {data.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "relative flex items-center justify-center rounded-[0.2rem] px-3 py-1.5 transition-all",
              sizeClasses[size],
              fullWidth && "flex-1",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              option.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
} 