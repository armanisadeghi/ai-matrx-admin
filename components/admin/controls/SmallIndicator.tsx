// components/admin/SmallIndicator.tsx
import React from "react";
import { TbBrandSocketIo } from "react-icons/tb";
import { Server, ChevronRight } from "lucide-react";
import StateViewerButton from "@/components/admin/state-analyzer/components/StateViewerButton";

interface SmallIndicatorProps {
  isConnected: boolean;
  currentServer: string;
  onDragStart: (e: React.MouseEvent) => void;
  onSizeChange: () => void;
}

const SmallIndicator: React.FC<SmallIndicatorProps> = ({
  isConnected,
  currentServer,
  onDragStart,
  onSizeChange,
}) => {
  // Handle mousedown without starting a drag on button elements
  const handleElementMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking a button
    let target = e.target as HTMLElement;
    let currentElement = target;
    
    // Check if we clicked on or within a button
    while (currentElement) {
      if (currentElement.tagName === 'BUTTON') {
        return; // Do nothing if button was clicked
      }
      currentElement = currentElement.parentElement;
    }
    
    // Otherwise, initiate drag
    onDragStart(e);
  };
  
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 text-white shadow-lg cursor-move"
      onMouseDown={handleElementMouseDown}
    >
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        <TbBrandSocketIo size={14} />
      </div>
      <div className="flex items-center gap-1">
        <div
          className={`w-2 h-2 rounded-full ${
            currentServer === "Not connected" || currentServer === "Connection error"
              ? "bg-red-500"
              : currentServer?.includes("localhost")
              ? "bg-green-400"
              : "bg-blue-400"
          }`}
        />
        <Server size={14} />
      </div>
      <StateViewerButton />
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent event from bubbling up
          onSizeChange();
        }}
        className="p-1 rounded hover:bg-slate-700"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

export default SmallIndicator;