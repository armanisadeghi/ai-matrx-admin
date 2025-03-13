import React, { useState } from "react";

interface ToggleButtonProps {
  isEnabled: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  defaultIcon: React.ReactElement<{ size?: number; className?: string }>;
  enabledIcon: React.ReactElement<{ size?: number; className?: string }>;
  enabledIconColor?: string;
  tooltip?: string; // New tooltip prop
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  isEnabled,
  onClick,
  disabled = false,
  label,
  defaultIcon,
  enabledIcon,
  enabledIconColor = "text-yellow-500",
  tooltip
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        className={`p-1 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700 
          ${
            isEnabled
              ? "bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200"
              : "text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
          }`}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-describedby={tooltip ? "tooltip" : undefined}
      >
        {isEnabled ? (
          React.cloneElement(enabledIcon, { 
            size: 18, 
            className: enabledIconColor 
          })
        ) : (
          React.cloneElement(defaultIcon, { 
            size: 18 
          })
        )}
        {label && (
          <span className="text-xs ml-1 pr-1">{label}</span>
        )}
      </button>
      
      {tooltip && showTooltip && (
        <div 
          id="tooltip"
          role="tooltip"
          className="absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-100 tooltip dark:bg-gray-700 transition-opacity duration-300 bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 min-w-max"
        >
          {tooltip}
          <div className="tooltip-arrow absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 left-1/2 -translate-x-1/2 translate-y-1 top-full"></div>
        </div>
      )}
    </div>
  );
};

export default ToggleButton;