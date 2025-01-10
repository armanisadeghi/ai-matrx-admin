'use client';

import React from 'react';
import { Atom } from 'lucide-react';

interface EditorChipButtonProps {
    editorId: string;
    onInsertChip: () => void;
    onConvertToChip: () => void;
    hasSelection: boolean;
}

export const EditorChipButton: React.FC<EditorChipButtonProps> = ({ onInsertChip, onConvertToChip, hasSelection }) => {
    const handleAction = (e: React.MouseEvent) => {
        // Stop the event from bubbling up to the editor
        e.preventDefault();
        e.stopPropagation();
        
        if (hasSelection) {
            onConvertToChip();
        } else {
            onInsertChip();
        }
    };

    return (
        <div 
            role="button"
            onClick={handleAction}
            onMouseDown={(e) => e.preventDefault()} // Prevent editor from losing focus
            className="absolute top-2 right-3 cursor-pointer opacity-0 group-hover:opacity-100"
        >
            <Atom 
                className="h-5 w-5 text-primary hover:text-primary/80 
                          transition-all duration-300 ease-in-out
                          hover:rotate-180 hover:scale-110 hover:h-6 hover:w-6
                          hover:drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]
                          active:scale-90 active:rotate-[170deg]" 
            />
        </div>
    );
};


