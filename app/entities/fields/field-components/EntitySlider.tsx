// app/entities/fields/EntitySlider.tsx

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"
import { FieldComponentProps } from "../types";
import { StandardFieldLabel } from "./add-ons/FloatingFieldLabel";

type EntitySliderProps = FieldComponentProps<number>;

const EntitySlider = React.forwardRef<
    React.ComponentRef<typeof SliderPrimitive.Root>,
    EntitySliderProps
>(({
    entityKey,
    dynamicFieldInfo,
    value,
    onChange,
    density = 'normal',
    variant = 'default',
    disabled = false,
    floatingLabel = false,
    className,
    ...props
}, ref) => {
    // Safely access component props
    const componentProps = dynamicFieldInfo.componentProps as Record<string, unknown>;
    const min = (componentProps?.min as number) ?? 0;
    const max = (componentProps?.max as number) ?? 100;
    const step = (componentProps?.step as number) ?? 1;
    const showValue = (componentProps?.showValue as boolean) ?? true;
    const safeValue = value ?? (min + (max - min) / 2);
    
    const variants = {
        destructive: "bg-destructive/20 [&>[data-slot=range]]:bg-destructive",
        success: "bg-green-500/20 [&>[data-slot=range]]:bg-green-500",
        outline: "bg-background border-2 [&>[data-slot=range]]:bg-primary",
        secondary: "bg-secondary/20 [&>[data-slot=range]]:bg-secondary",
        ghost: "bg-background/20 [&>[data-slot=range]]:bg-background/50",
        link: "bg-primary/20 [&>[data-slot=range]]:bg-primary/50",
        primary: "bg-primary/20 [&>[data-slot=range]]:bg-primary",
        default: "bg-primary/20 [&>[data-slot=range]]:bg-primary",
    };

    const densityConfig = {
        compact: {
            wrapper: "gap-1",
            track: "h-1",
            thumb: "h-3 w-3",
            label: "text-sm",
        },
        normal: {
            wrapper: "gap-2",
            track: "h-1.5",
            thumb: "h-4 w-4",
            label: "text-base",
        },
        comfortable: {
            wrapper: "gap-3",
            track: "h-2",
            thumb: "h-5 w-5",
            label: "text-lg",
        },
    };

    const handleChange = (newValue: number[]) => {
        onChange(newValue[0]);
    };

    const uniqueId = `${entityKey}-${dynamicFieldInfo.name}`;

    return (
        <div className={cn("w-full space-y-2", className)}>
          <div className="flex justify-between">
            <StandardFieldLabel
              htmlFor={dynamicFieldInfo.name}
              disabled={disabled}
              required={dynamicFieldInfo.isRequired}
              className={densityConfig[density as keyof typeof densityConfig]?.label}
            >
              {dynamicFieldInfo.displayName}
            </StandardFieldLabel>
            {showValue && (
              <span
                className={cn(
                  densityConfig[density as keyof typeof densityConfig]?.label,
                  "text-muted-foreground"
                )}
              >
                {safeValue}
              </span>
            )}
          </div>
          <SliderPrimitive.Root
            ref={ref}
            id={dynamicFieldInfo.name}
            min={min}
            max={max}
            step={step}
            value={[safeValue]}
            onValueChange={handleChange}
            disabled={disabled}
            className={cn(
              "relative flex w-full touch-none select-none items-center",
              densityConfig[density as keyof typeof densityConfig]?.wrapper
            )}
          >
            <SliderPrimitive.Track
              className={cn(
                "relative w-full grow overflow-hidden rounded-full",
                densityConfig[density as keyof typeof densityConfig]?.track,
                variants[variant as keyof typeof variants] || variants.default,
                disabled && "opacity-50"
              )}
            >
              <SliderPrimitive.Range
                data-slot="range"
                className="absolute h-full"
              />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb
              className={cn(
                "block rounded-full border border-primary/50 bg-background shadow transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50",
                densityConfig[density as keyof typeof densityConfig]?.thumb
              )}
            />
          </SliderPrimitive.Root>
        </div>
      );
    }
  );
  
  EntitySlider.displayName = "EntitySlider";
  
  export default React.memo(EntitySlider);
  