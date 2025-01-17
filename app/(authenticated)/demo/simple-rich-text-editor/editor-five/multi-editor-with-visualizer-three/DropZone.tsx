'use client';

import React from 'react';

// Reusable drop zone component
export const DropZone = ({ 
    isActive, 
    onDragOver, 
    onDragLeave, 
    onDrop 
}: { 
    isActive: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
}) => (
    <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
            transition-all duration-200 mx-4
            ${isActive 
                ? 'h-24 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 dark:bg-blue-900/20' 
                : 'h-2'
            }
        `}
    />
);
