'use client';

import React, { useEffect, useRef, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EntityStateField } from "@/lib/redux/entity/types/stateTypes";

const useVariantStyles = (variant: string) =>
  useMemo(
    () =>
      ({
        destructive: "border-destructive text-destructive",
        success: "border-success text-success",
        outline: "border-2",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "border-none bg-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        primary: "bg-primary text-primary-foreground",
        default: "",
      }[variant]),
    [variant]
  );

const useDensityConfig = (density: string) =>
  useMemo(
    () =>
      ({
        compact: {
          wrapper: "gap-1 py-0.5",
          textarea: "p-1.5",
          label: "text-sm",
        },
        normal: {
          wrapper: "gap-2 py-1",
          textarea: "p-2",
          label: "text-base",
        },
        comfortable: {
          wrapper: "gap-3 py-1.5",
          textarea: "p-2.5",
          label: "text-lg",
        },
      }[density] ?? {
        wrapper: "gap-2 py-1",
        textarea: "p-2",
        label: "text-base",
      }),
    [density]
  );

interface EntityComponentBaseProps {
  entityKey: string;
  dynamicFieldInfo: EntityStateField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  density?: string;
  animationPreset?: string;
  size?: string;
  variant?: string;
  floatingLabel?: boolean;
}

interface EntityTextareaProps
  extends EntityComponentBaseProps,
    Omit<
      React.TextareaHTMLAttributes<HTMLTextAreaElement>,
      "onChange" | "value"
    > {}

const EntityTextareaFullWidth = React.forwardRef<
  HTMLTextAreaElement,
  EntityTextareaProps
>(
  (
    {
      entityKey,
      dynamicFieldInfo,
      value = "",
      onChange,
      density = "normal",
      animationPreset = "smooth",
      size = "default",
      className,
      variant = "default",
      disabled = false,
      floatingLabel = false,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    
    const customProps = dynamicFieldInfo.componentProps as Record<string, unknown>;
    const initialRows = customProps?.rows as number ?? 3;
    const maxRows = customProps?.maxRows as number ?? 35;

    const variantStyles = useVariantStyles(variant);
    const densityStyles = useDensityConfig(density);

    const safeValue = value === null || value === undefined
      ? ""
      : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const adjustHeight = () => {
        textarea.style.height = 'auto';
        const singleLineHeight = parseInt(getComputedStyle(textarea).lineHeight);
        const maxHeight = singleLineHeight * maxRows;
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.min(scrollHeight, maxHeight);

        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
      };

      adjustHeight();
    }, [safeValue, maxRows]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    };

    const textareaProps = {
      id: dynamicFieldInfo.name,
      value: safeValue,
      onChange: handleChange,
      required: dynamicFieldInfo.isRequired,
      disabled,
      rows: initialRows,
      ref: textareaRef,
      className: cn(
        "min-h-[80px] w-full resize-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        "hover:ring-1 hover:ring-primary/50",
        densityStyles.textarea,
        variantStyles,
        disabled ? "cursor-not-allowed opacity-50 bg-muted" : "",
        floatingLabel && "pt-6 pb-2",
        className
      ),
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      ...props,
    };

    return (
      <div className={cn("w-full col-span-full", densityStyles.wrapper)}>
        <div className="relative">
          <Textarea {...textareaProps} />
          {dynamicFieldInfo.displayName && (
            <Label
              htmlFor={dynamicFieldInfo.name}
              className={cn(
                densityStyles.label,
                "font-medium select-none",
                disabled ? "text-muted-foreground cursor-not-allowed" : "text-foreground",
                floatingLabel
                  ? cn(
                      "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20",
                      isFocused || !!safeValue
                        ? "-top-2 text-sm text-primary"
                        : "top-3 text-muted-foreground"
                    )
                  : "block mb-1"
              )}
            >
              {dynamicFieldInfo.displayName}
            </Label>
          )}
        </div>
      </div>
    );
  }
);

EntityTextareaFullWidth.displayName = "EntityTextareaFullWidth";

export default React.memo(EntityTextareaFullWidth);