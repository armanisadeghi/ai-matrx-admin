import React, { useState, useEffect } from "react";
import { ChatInputSettings } from "@/hooks/ai/chat/useChatInput";

interface ActionButtonsProps {
  onModeSelect?: (mode: ChatInputSettings['mode']) => void;
  className?: string;
  initialMode?: ChatInputSettings['mode'];
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  onModeSelect,
  className = "",
  initialMode
}) => {
  // Track the currently selected mode
  const [selectedMode, setSelectedMode] = useState<ChatInputSettings['mode'] | undefined>(initialMode);

  // Update selected mode if initialMode changes (from URL for example)
  useEffect(() => {
    if (initialMode) {
      setSelectedMode(initialMode);
    }
  }, [initialMode]);

  // Action buttons with their corresponding modes
  const actionButtons = [
    { label: "Research", mode: "research" as const },
    { label: "Brainstorm", mode: "brainstorm" as const },
    { label: "Analyze Data", mode: "analyze" as const },
    { label: "Create Images", mode: "images" as const },
    { label: "Code", mode: "code" as const }
  ];

  const handleModeSelect = (mode: ChatInputSettings['mode']) => {
    setSelectedMode(mode);
    
    if (onModeSelect) {
      onModeSelect(mode);
    }
  };

  return (
    <div className={`flex justify-center flex-wrap gap-3 ${className}`}>
      {actionButtons.map(({ label, mode }) => {
        const isSelected = selectedMode === mode;
        const buttonClasses = isSelected
          ? "px-4 py-2 rounded-full flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 transition-colors"
          : "px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300";

        return (
          <button
            key={mode}
            onClick={() => handleModeSelect(mode)}
            className={buttonClasses}
            aria-pressed={isSelected}
          >
            <span className="text-sm">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ActionButtons;