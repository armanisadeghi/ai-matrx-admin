"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactElement,
} from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TapTargetButtonProps {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  strokeWidth?: number;
  onClick?: () => void;
  className?: string;
  as?: "button" | "label";
  htmlFor?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /**
   * Tooltip text. Defaults to `ariaLabel` when omitted.
   * Pass `false` to explicitly disable the tooltip.
   */
  tooltip?: string | false;
  /** Tooltip placement. Defaults to "top". */
  tooltipSide?: "top" | "right" | "bottom" | "left";
  /** Tooltip alignment along its side. Defaults to "center". */
  tooltipAlign?: "start" | "center" | "end";
}

interface TapTargetButtonSolidProps extends TapTargetButtonProps {
  bgColor?: string;
  iconColor?: string;
  hoverBgColor?: string;
}

function IconContent({
  icon,
  children,
  strokeWidth = 2,
  className,
}: Pick<
  TapTargetButtonProps,
  "icon" | "children" | "strokeWidth" | "className"
>) {
  if (icon) return <>{icon}</>;
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    >
      {children}
    </svg>
  );
}

/**
 * Wraps a trigger element in a Tooltip when a tooltip label is available.
 * Falls back to `ariaLabel` when `tooltip` is not explicitly set. If both
 * are absent (or `tooltip === false`), the trigger is returned unwrapped.
 */
function withTooltip(
  trigger: ReactElement,
  {
    tooltip,
    ariaLabel,
    disabled,
    tooltipSide = "top",
    tooltipAlign = "center",
  }: {
    tooltip?: string | false;
    ariaLabel?: string;
    disabled?: boolean;
    tooltipSide?: "top" | "right" | "bottom" | "left";
    tooltipAlign?: "start" | "center" | "end";
  },
): ReactElement {
  if (tooltip === false) return trigger;
  const label =
    typeof tooltip === "string" && tooltip.length > 0 ? tooltip : ariaLabel;
  if (!label) return trigger;
  return (
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>
        {disabled ? (
          // Radix Tooltip triggers need a hoverable element; a disabled button
          // does not dispatch pointer events, so we wrap in a span for the
          // trigger target while keeping the disabled visual state.
          <span className="inline-flex">{trigger}</span>
        ) : (
          trigger
        )}
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} align={tooltipAlign}>
        {label}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}

export const TapTargetButton = forwardRef<
  HTMLButtonElement,
  TapTargetButtonProps & ButtonHTMLAttributes<HTMLButtonElement>
>(function TapTargetButton(
  {
    icon,
    children,
    strokeWidth = 2,
    onClick,
    className,
    as,
    htmlFor,
    ariaLabel,
    disabled,
    tooltip,
    tooltipSide,
    tooltipAlign,
    ...rest
  },
  ref,
) {
  const color = className ?? "text-foreground";
  if (as === "label") {
    const labelEl = (
      <label
        htmlFor={htmlFor}
        aria-label={ariaLabel}
        className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 group outline-none cursor-pointer"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full matrx-shell-glass transition-colors">
          <IconContent
            icon={icon}
            strokeWidth={strokeWidth}
            className={`w-4 h-4 ${color}`}
          >
            {children}
          </IconContent>
        </div>
      </label>
    );
    return withTooltip(labelEl, {
      tooltip,
      ariaLabel,
      disabled,
      tooltipSide,
      tooltipAlign,
    });
  }
  const buttonEl = (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      {...rest}
      className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 group outline-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full matrx-shell-glass transition-colors">
        <IconContent
          icon={icon}
          strokeWidth={strokeWidth}
          className={`w-4 h-4 ${color}`}
        >
          {children}
        </IconContent>
      </div>
    </button>
  );
  return withTooltip(buttonEl, {
    tooltip,
    ariaLabel,
    disabled,
    tooltipSide,
    tooltipAlign,
  });
});

export const TapTargetButtonTransparent = forwardRef<
  HTMLButtonElement,
  TapTargetButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function TapTargetButtonTransparent(
  {
    icon,
    children,
    strokeWidth = 2,
    onClick,
    className,
    ariaLabel,
    disabled,
    tooltip,
    tooltipSide,
    tooltipAlign,
    ...rest
  },
  ref,
) {
  const color = className ?? "text-foreground";
  const buttonEl = (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      {...rest}
      className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 group outline-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
    >
      <div className="flex h-8 w-8 items-center justify-center hover:bg-muted rounded-full transition-colors">
        <IconContent
          icon={icon}
          strokeWidth={strokeWidth}
          className={`w-4 h-4 ${color}`}
        >
          {children}
        </IconContent>
      </div>
    </button>
  );
  return withTooltip(buttonEl, {
    tooltip,
    ariaLabel,
    disabled,
    tooltipSide,
    tooltipAlign,
  });
});

export const TapTargetButtonSolid = forwardRef<
  HTMLButtonElement,
  TapTargetButtonSolidProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function TapTargetButtonSolid(
  {
    icon,
    children,
    strokeWidth = 2,
    onClick,
    ariaLabel,
    disabled,
    bgColor = "bg-primary",
    iconColor = "text-primary-foreground",
    hoverBgColor = "hover:bg-primary/80",
    tooltip,
    tooltipSide,
    tooltipAlign,
    ...rest
  },
  ref,
) {
  const buttonEl = (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      {...rest}
      className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 group outline-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${bgColor} ${hoverBgColor}`}
      >
        <IconContent
          icon={icon}
          strokeWidth={strokeWidth}
          className={`w-4 h-4 ${iconColor}`}
        >
          {children}
        </IconContent>
      </div>
    </button>
  );
  return withTooltip(buttonEl, {
    tooltip,
    ariaLabel,
    disabled,
    tooltipSide,
    tooltipAlign,
  });
});

export const TapTargetButtonForGroup = forwardRef<
  HTMLButtonElement,
  TapTargetButtonProps & ButtonHTMLAttributes<HTMLButtonElement>
>(function TapTargetButtonForGroup(
  {
    icon,
    children,
    strokeWidth = 2,
    onClick,
    className,
    ariaLabel,
    disabled,
    tooltip,
    tooltipSide,
    tooltipAlign,
    ...rest
  },
  ref,
) {
  const color = className ?? "text-foreground";
  const buttonEl = (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      {...rest}
      className="flex h-9 w-9 items-center justify-center bg-transparent group outline-none disabled:opacity-40 disabled:pointer-events-none"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full matrx-glass-interactive transition-[background,transform] active:scale-95">
        <IconContent
          icon={icon}
          strokeWidth={strokeWidth}
          className={`w-4 h-4 ${color}`}
        >
          {children}
        </IconContent>
      </div>
    </button>
  );
  return withTooltip(buttonEl, {
    tooltip,
    ariaLabel,
    disabled,
    tooltipSide,
    tooltipAlign,
  });
});

export function TapTargetButtonGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        className
          ? `relative inline-flex h-9 items-center ${className}`
          : "relative inline-flex h-9 items-center"
      }
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 rounded-full matrx-glass-thin-border" />
      <div className="relative flex items-center">{children}</div>
    </div>
  );
}
