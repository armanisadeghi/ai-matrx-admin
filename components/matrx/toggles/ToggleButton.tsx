import React, { useState } from "react";
import { Loader2, Clock, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility in this location

interface ToggleButtonProps {
  isEnabled: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  defaultIcon: React.ReactElement<{ size?: number; className?: string }>;
  enabledIcon: React.ReactElement<{ size?: number; className?: string }>;
  enabledIconColor?: string;
  tooltip?: string;
  isLoading?: boolean; // Loading state prop
  isWaiting?: boolean; // Waiting for user interaction prop
  waitingTooltip?: string; // Tooltip text for waiting state
  className?: string; // Additional classes for the button
  iconClassName?: string; // Additional classes for the icon
  labelClassName?: string; // Additional classes for the label
  tooltipClassName?: string; // Additional classes for the tooltip
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
  className,
  iconClassName,
  labelClassName,
  tooltipClassName
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        className={cn(
          "py-1 px-2 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700 transition-colors", 
          isEnabled
            ? "bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200"
            : "text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={onClick}
        disabled={disabled || isLoading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-describedby={(tooltip || waitingTooltip) ? "tooltip" : undefined}
        data-waiting={isWaiting}
      >
        {isLoading ? (
          <Loader2 
            size={18} 
            className={cn("animate-spin text-blue-500 dark:text-blue-400", iconClassName)} 
          />
        ) : isWaiting ? (
          <Clock
            size={18}
            className={cn("text-green-500 dark:text-green-400 animate-pulse", iconClassName)}
          />
        ) : isEnabled ? (
          React.cloneElement(enabledIcon, { 
            size: 18, 
            className: cn(enabledIconColor, iconClassName)
          })
        ) : (
          React.cloneElement(defaultIcon, { 
            size: 18,
            className: cn(iconClassName)
          })
        )}
        
        {label && (
          <span className={cn("text-xs ml-1 pr-1", labelClassName)}>
            {label}
          </span>
        )}
      </button>
      
      {showTooltip && (isWaiting ? waitingTooltip : tooltip) && (
        <div 
          id="tooltip"
          role="tooltip"
          className={cn(
            "absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-sm",
            "opacity-100 tooltip transition-opacity duration-300 bottom-full left-1/2",
            "transform -translate-x-1/2 -translate-y-2 min-w-max",
            tooltipClassName
          )}
        >
          {isWaiting ? waitingTooltip : tooltip}
          <div className="tooltip-arrow absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 left-1/2 -translate-x-1/2 translate-y-1 top-full" />
        </div>
      )}
    </div>
  );
};

export default ToggleButton;