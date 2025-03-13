import React from "react";
import { ChatMode } from "@/types/chat/chat.types";
import { useConversationRouting } from "@/hooks/ai/chat/useConversationRouting";

interface ActionButtonsProps {
  onModeSelect?: (mode: ChatMode) => void;
  className?: string;
  initialMode?: ChatMode;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  onModeSelect,
  className = "",
  initialMode
}) => {
  // Use the conversation routing hook to manage the mode state
  const { currentMode, setCurrentMode } = useConversationRouting({
    initialMode,
  });

  // Action buttons with their corresponding modes
  const actionButtons = [
    { label: "General", mode: "general" as const },
    { label: "Generate Images", mode: "images" as const },
    { label: "Generate Video", mode: "video" as const },
    { label: "Research", mode: "research" as const },
    { label: "Brainstorm", mode: "brainstorm" as const },
    { label: "Analyze Data", mode: "analyze" as const },
    { label: "Code", mode: "code" as const }
  ];

  const handleModeSelect = (mode: ChatMode) => {
    // Update the mode via the hook (this will update the URL)
    setCurrentMode(mode);
    
    // Still call the callback if provided (for backward compatibility)
    if (onModeSelect) {
      onModeSelect(mode);
    }
  };

  return (
    <div className={`flex justify-center flex-wrap gap-3 ${className}`}>
      {actionButtons.map(({ label, mode }) => {
        const isSelected = currentMode === mode;
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
            <span className="text-xs">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ActionButtons;