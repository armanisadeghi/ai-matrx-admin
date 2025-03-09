import React from "react";
import { IconType } from "react-icons";
import { LucideIcon } from "lucide-react";

interface ToggleButtonProps {
  isEnabled: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  defaultIcon: React.ReactElement<{ size?: number; className?: string }>;
  enabledIcon: React.ReactElement<{ size?: number; className?: string }>;
  enabledIconColor?: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  isEnabled,
  onClick,
  disabled = false,
  label,
  defaultIcon,
  enabledIcon,
  enabledIconColor = "text-yellow-500"
}) => {
  return (
    <button
      className={`p-2 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700 
        ${
          isEnabled
            ? "bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200"
            : "text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
        }`}
      onClick={onClick}
      disabled={disabled}
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
      <span className="text-sm ml-1">{label}</span>
    </button>
  );
};

export default ToggleButton;