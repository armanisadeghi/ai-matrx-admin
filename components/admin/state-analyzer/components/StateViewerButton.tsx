// state-analyzer/components/StateViewerButton.tsx
import React, { useState } from "react";
import { Database } from "lucide-react"; // Using the Database icon for Redux state
import StateViewerOverlay from "../StateViewerOverlay";

const StateViewerButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent event from bubbling up
          setIsOpen(true);
        }}
        className="p-1 rounded hover:bg-slate-700"
        title="View Redux State"
      >
        <Database size={14} />
      </button>
      
      <StateViewerOverlay 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
};

export default StateViewerButton;