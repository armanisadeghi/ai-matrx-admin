import React, { useState } from "react";
import { Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToggleButtonProps {
  isEnabled: boolean;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  defaultIcon: React.ReactElement<{ size?: number; className?: string }>;
  enabledIcon: React.ReactElement<{ size?: number; className?: string }>;
  enabledIconColor?: string;
  tooltip?: string;
  isLoading?: boolean;
  isWaiting?: boolean;
  waitingTooltip?: string;
  /** Icon size in px — defaults to 14 for compact admin-indicator style */
  iconSize?: number;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  tooltipClassName?: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  isEnabled,
  onClick,
  disabled = false,
  label,
  defaultIcon,
  enabledIcon,
  enabledIconColor = "text-yellow-500",
  tooltip,
  isLoading = false,
  isWaiting = false,
  waitingTooltip,
  iconSize = 14,
  className,
  iconClassName,
  labelClassName,
  tooltipClassName,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        className={cn(
          "p-1 rounded flex items-center gap-1 transition-colors",
          isEnabled
            ? "bg-slate-600 text-white"
            : "text-slate-300 hover:bg-slate-700",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
        onClick={onClick}
        disabled={disabled || isLoading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-describedby={
          tooltip || waitingTooltip ? "toggle-tooltip" : undefined
        }
        data-waiting={isWaiting}
      >
        {isLoading ? (
          <Loader2
            size={iconSize}
            className={cn("animate-spin text-blue-400", iconClassName)}
          />
        ) : isWaiting ? (
          <Clock
            size={iconSize}
            className={cn("text-green-400 animate-pulse", iconClassName)}
          />
        ) : isEnabled ? (
          React.cloneElement(enabledIcon, {
            size: iconSize,
            className: cn(enabledIconColor, iconClassName),
          })
        ) : (
          React.cloneElement(defaultIcon, {
            size: iconSize,
            className: cn(iconClassName),
          })
        )}

        {label && (
          <span className={cn("text-xs", labelClassName)}>{label}</span>
        )}
      </button>

      {showTooltip && (isWaiting ? waitingTooltip : tooltip) && (
        <div
          id="toggle-tooltip"
          role="tooltip"
          className={cn(
            "absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-sm",
            "bottom-full left-1/2 -translate-x-1/2 -translate-y-1.5 min-w-max pointer-events-none",
            tooltipClassName,
          )}
        >
          {isWaiting ? waitingTooltip : tooltip}
          <div className="absolute w-2 h-2 bg-gray-900 rotate-45 left-1/2 -translate-x-1/2 translate-y-1 top-full" />
        </div>
      )}
    </div>
  );
};

export default ToggleButton;
