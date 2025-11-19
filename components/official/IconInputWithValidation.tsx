"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, X, ExternalLink } from "lucide-react";
import IconResolver, { getIconComponent } from "@/components/official/IconResolver";
import { cn } from "@/lib/utils";

interface IconInputWithValidationProps {
  /** Current icon name value */
  value: string;
  /** Callback when icon name changes */
  onChange: (iconName: string) => void;
  /** Input placeholder text */
  placeholder?: string;
  /** Additional className for the input */
  className?: string;
  /** Input ID for label association */
  id?: string;
  /** Disable the input */
  disabled?: boolean;
  /** Show link to Lucide icons site */
  showLucideLink?: boolean;
}

type ValidationState = "idle" | "validating" | "valid" | "invalid";

/**
 * IconInputWithValidation - Official Component
 * 
 * All-in-one icon name input with validation and preview.
 * 
 * Features:
 * - Real-time icon validation
 * - Visual feedback (green check / red X)
 * - Live icon preview when valid
 * - Auto-capitalizes first letter for better UX
 * - Link to Lucide icons reference
 * - Seamless integration - replaces standard Input
 * 
 * @example
 * ```tsx
 * <IconInputWithValidation
 *   value={iconName}
 *   onChange={setIconName}
 *   placeholder="e.g., Sparkles"
 * />
 * ```
 */
export default function IconInputWithValidation({
  value,
  onChange,
  placeholder = "e.g., Sparkles",
  className,
  id,
  disabled = false,
  showLucideLink = true,
}: IconInputWithValidationProps) {
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [validatedIconName, setValidatedIconName] = useState<string | null>(null);
  const [lastValidatedValue, setLastValidatedValue] = useState<string>("");

  /**
   * Validates an icon name by attempting to load it dynamically
   */
  const validateIcon = useCallback(async (iconName: string) => {
    if (!iconName || iconName.trim() === "") {
      setValidationState("idle");
      setValidatedIconName(null);
      return;
    }

    setValidationState("validating");

    // Helper to check if icon exists
    const checkIcon = async (name: string): Promise<boolean> => {
      try {
        // First check static/cached icons (instant)
        const staticIcon = getIconComponent(name);
        if (staticIcon) {
          return true;
        }

        // Try dynamic import for other Lucide icons
        const iconModule = await import("lucide-react");
        return Boolean(iconModule[name as keyof typeof iconModule]);
      } catch {
        return false;
      }
    };

    // Try the icon name as-is
    const isValid = await checkIcon(iconName);

    if (isValid) {
      setValidationState("valid");
      setValidatedIconName(iconName);
      setLastValidatedValue(iconName);
      return;
    }

    // If failed and first letter is lowercase, try capitalizing
    if (iconName[0] === iconName[0].toLowerCase()) {
      const capitalized = iconName.charAt(0).toUpperCase() + iconName.slice(1);
      const isCapitalizedValid = await checkIcon(capitalized);

      if (isCapitalizedValid) {
        setValidationState("valid");
        setValidatedIconName(capitalized);
        setLastValidatedValue(capitalized);
        // Auto-update the value with capitalized version
        onChange(capitalized);
        return;
      }
    }

    // Icon not found
    setValidationState("invalid");
    setValidatedIconName(null);
    setLastValidatedValue(iconName);
  }, [onChange]);

  // Auto-validate when value changes externally (e.g., form load)
  useEffect(() => {
    // Only validate if value has changed and hasn't been validated yet
    if (value && value.trim() !== "" && value !== lastValidatedValue) {
      validateIcon(value);
    } else if (!value || value.trim() === "") {
      // Reset validation state if value is cleared
      setValidationState("idle");
      setValidatedIconName(null);
      setLastValidatedValue("");
    }
  }, [value, lastValidatedValue, validateIcon]);

  const handleValidateClick = () => {
    validateIcon(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Reset validation state when user types
    if (validationState !== "idle") {
      setValidationState("idle");
      setValidatedIconName(null);
    }
  };

  const getStatusIcon = () => {
    switch (validationState) {
      case "validating":
        return <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />;
      case "valid":
        return <Check className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "invalid":
        return <X className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {/* Input with validation button */}
        <div className="relative flex-1">
          <Input
            id={id}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn("pr-10", className)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                validateIcon(value);
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || !value || validationState === "validating"}
            onClick={handleValidateClick}
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            title="Validate icon"
          >
            {getStatusIcon()}
          </Button>
        </div>

        {/* Icon preview when valid */}
        {validationState === "valid" && validatedIconName && (
          <div className="flex-shrink-0 w-10 h-10 border rounded-md flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <IconResolver iconName={validatedIconName} className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Helper text with Lucide link */}
      {showLucideLink && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Lucide icon name</span>
          <span>•</span>
          <a
            href="https://lucide.dev/icons/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Browse icons
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Validation feedback messages */}
      {validationState === "invalid" && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Icon not found. Try a different name or browse available icons.
        </p>
      )}
      {validationState === "valid" && validatedIconName !== value && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Auto-corrected to: <code className="font-mono">{validatedIconName}</code>
        </p>
      )}
    </div>
  );
}

/**
 * Compact variant without helper text - perfect for forms with limited space
 */
export function IconInputCompact({
  value,
  onChange,
  placeholder = "Icon name",
  className,
  id,
  disabled = false,
}: Omit<IconInputWithValidationProps, 'showLucideLink'>) {
  return (
    <IconInputWithValidation
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      id={id}
      disabled={disabled}
      showLucideLink={false}
    />
  );
}

