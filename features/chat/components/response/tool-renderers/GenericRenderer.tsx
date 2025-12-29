"use client";

import React from "react";
import { ToolRendererProps } from "./types";

/**
 * Generic fallback renderer for tools without custom displays
 * Shows user_visible_message if available, otherwise minimal status
 */
export const GenericRenderer: React.FC<ToolRendererProps> = ({ toolUpdates, currentIndex }) => {
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    return (
        <div className="space-y-2">
            {visibleUpdates.map((update, index) => {
                // Render user visible messages
                if (update.user_visible_message) {
                    return (
                        <div
                            key={`message-${index}`}
                            className="text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-bottom duration-300"
                        >
                            {update.user_visible_message}
                        </div>
                    );
                }
                
                return null;
            })}
        </div>
    );
};

