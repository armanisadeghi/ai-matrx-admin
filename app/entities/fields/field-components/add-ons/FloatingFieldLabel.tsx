import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface UnifiedLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  required?: boolean;
  optional?: boolean;
  isFocused?: boolean;
  hasValue?: boolean;
}

export const FloatingFieldLabel = React.memo(
  ({
    htmlFor,
    children,
    disabled = false,
    isFocused,
    hasValue,
    error = false,
    className,
  }: UnifiedLabelProps) => {
    return (
      <Label
        htmlFor={htmlFor}
        className={cn(
          "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20 text-sm",
          isFocused || hasValue
            ? cn(
                "absolute -top-2 text-sm",
                disabled
                  ? "[&]:text-blue-400 dark:[&]:text-blue-400"
                  : error
                  ? "[&]:text-destructive dark:[&]:text-destructive"
                  : "[&]:text-blue-500 dark:[&]:text-blue-500"
              )
            : "top-3 [&]:text-blue-400 dark:[&]:text-blue-400",
          className
        )}
      >
        <span className="px-1 relative z-20">{children}</span>
      </Label>
    );
  }
);

export const FloatingSelectLabel = React.memo(
  ({
    htmlFor,
    children,
    disabled = false,
    isFocused,
    hasValue,
    error = false,
    className,
  }: UnifiedLabelProps) => {
    return (
      <Label
        htmlFor={htmlFor}
        className={cn(
          "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20 text-sm",
          isFocused || hasValue
            ? cn(
                "absolute -top-2.5 text-sm",
                disabled
                  ? "[&]:text-blue-400 dark:[&]:text-blue-400"
                  : error
                  ? "[&]:text-destructive dark:[&]:text-destructive"
                  : "[&]:text-blue-500 dark:[&]:text-blue-500"
              )
            : "top-3 [&]:text-blue-400 dark:[&]:text-blue-400",
          className
        )}
      >
        <span className="px-1 relative z-20">{children}</span>
      </Label>
    );
  }
);

export const StandardFieldLabel = React.memo(
  ({
    htmlFor,
    children,
    disabled = false,
    required = false,
    optional = false,
    error = false,
    className,
  }: UnifiedLabelProps) => {
    return (
      <Label
        htmlFor={htmlFor}
        className={cn(
          "block text-sm font-medium mb-1",
          disabled ? "text-blue-400 dark:text-blue-400" : "text-blue-500 dark:text-blue-500",
          error && "text-destructive",
          className
        )}
      >
        {children}
        {required && <span className="text-destructive ml-1">*</span>}
        {optional && (
          <span className="text-muted-foreground ml-1">(optional)</span>
        )}
      </Label>
    );
  }
);

// For type safety and better DX
FloatingFieldLabel.displayName = "FloatingFieldLabel";
FloatingSelectLabel.displayName = "FloatingSelectLabel";
StandardFieldLabel.displayName = "StandardFieldLabel";