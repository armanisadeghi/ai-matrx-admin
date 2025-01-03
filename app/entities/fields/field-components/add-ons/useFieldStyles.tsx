import { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { DynamicStyleOptions } from '@/components/matrx/Entity';


interface UseFieldStylesProps extends Omit<DynamicStyleOptions, 'animationPreset'> {
  disabled?: boolean;
  error?: boolean;
  focused?: boolean;
  hasValue?: boolean;
  isFloating?: boolean;
  className?: string;
  customStates?: Record<string, boolean>;
}

export const useFieldStyles = ({
  variant = 'default',
  size = 'default',
  textSize = 'default',
  density = 'normal',
  disabled = false,
  error = false,
  focused = false,
  hasValue = false,
  isFloating = false,
  className = '',
  customStates = {}
}: UseFieldStylesProps) => {
  const baseStyles = useMemo(() => {
    const base = "w-full rounded-md transition-colors";
    return cn(base, className);
  }, [className]);

  const variantStyles = useMemo(
    () => ({
      default: "border border-input bg-background hover:bg-accent/50",
      destructive: "border-destructive text-destructive",
      success: "border-success text-success",
      outline: "border-2",
      secondary: "bg-secondary text-secondary-foreground",
      ghost: "border-none bg-transparent hover:bg-accent/50",
      link: "text-primary underline-offset-4 hover:underline",
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    }),
    []
  );

  // Component sizes - mapped to common heights
  const sizeStyles = useMemo(
    () => ({
      default: "h-10",
      xs: "h-6",
      sm: "h-8",
      md: "h-10",
      lg: "h-12",
      xl: "h-14",
      "2xl": "h-16",
      "3xl": "h-20",
      icon: "h-10 aspect-square",  // Square aspect ratio for icon inputs
    }),
    []
  );

  // Text sizes
  const textSizeStyles = useMemo(
    () => ({
      default: "text-base",
      xs: "text-xs",
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
      hideText: "sr-only",
    }),
    []
  );

  // Minimal internal spacing based on density
  const densityStyles = useMemo(
    () => ({
      compact: "px-0.5 py-0", // Minimal internal spacing
      normal: "px-1 py-0.5",      // Moderate internal spacing
      comfortable: "px-2 py-2",  // More generous spacing
    }),
    []
  );

  const stateStyles = useMemo(
    () => ({
      disabled: "cursor-not-allowed opacity-50 bg-muted",
      error: "border-destructive focus-visible:ring-destructive",
      focused: "ring-2 ring-ring ring-offset-background",
      floating: isFloating ? "pt-4 pb-1" : "", // Only apply if floating label is enabled
    }),
    [isFloating]
  );

  const getFieldStyles = useMemo(() => {
    return cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      textSizeStyles[textSize],
      densityStyles[density],
      disabled && stateStyles.disabled,
      error && stateStyles.error,
      focused && stateStyles.focused,
      stateStyles.floating,
      // Apply any custom states
      Object.entries(customStates).reduce(
        (acc, [state, isActive]) => (isActive ? `${acc} ${state}` : acc),
        ''
      )
    );
  }, [
    baseStyles,
    variant,
    size,
    textSize,
    density,
    disabled,
    error,
    focused,
    isFloating,
    customStates,
  ]);

  // Component-specific style getters
  const getInputStyles = useMemo(
    () => cn(
      getFieldStyles,
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      "placeholder:text-muted-foreground"
    ),
    [getFieldStyles]
  );

  const getTextareaStyles = useMemo(
    () => cn(
      getFieldStyles,
      "min-h-[80px] resize-vertical"
    ),
    [getFieldStyles]
  );

  const getSelectStyles = useMemo(
    () => cn(
      getFieldStyles,
      "pr-8" // Space for the dropdown arrow
    ),
    [getFieldStyles]
  );

  // Switch has unique styling needs
  const getSwitchStyles = useMemo(
    () => ({
      root: cn(
        sizeStyles[size], // Use the same size system
        "peer inline-flex shrink-0 cursor-pointer",
        "items-center rounded-full border-2 border-transparent",
        "transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background disabled:cursor-not-allowed",
        "disabled:opacity-50 data-[state=checked]:bg-primary",
        "data-[state=unchecked]:bg-input"
      ),
      thumb: cn(
        "pointer-events-none block rounded-full bg-background",
        "shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5",
        "data-[state=unchecked]:translate-x-0",
        // Size-based thumb dimensions
        size === 'xs' && "h-4 w-4",
        size === 'sm' && "h-5 w-5",
        size === 'default' && "h-6 w-6",
        size === 'lg' && "h-7 w-7",
        size === 'xl' && "h-8 w-8",
      ),
    }),
    [size]
  );

  return {
    getFieldStyles,
    getInputStyles,
    getTextareaStyles,
    getSelectStyles,
    getSwitchStyles,
    baseStyles,
    variantStyles,
    sizeStyles,
    textSizeStyles,
    densityStyles,
    stateStyles,
  };
};