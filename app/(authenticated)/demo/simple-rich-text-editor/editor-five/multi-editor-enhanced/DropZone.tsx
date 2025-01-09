import React from 'react';

// Enhanced drop zone component with overlapping areas
const DropZone = ({ 
    isActive, 
    onDragOver, 
    onDragLeave, 
    onDrop,
    isFirst = false,
    isLast = false
}: { 
    isActive: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    isFirst?: boolean;
    isLast?: boolean;
}) => (
    <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
            absolute left-0 right-0 z-10
            transition-all duration-200 ease-in-out pointer-events-none
            ${isFirst ? 'top-0 h-1/3' : isLast ? 'bottom-0 h-1/3' : '-top-1/4 -bottom-1/4'}
        `}
    >
        <div className={`
            absolute inset-0 pointer-events-auto
            ${isActive ? 'bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900/20' : ''}
        `}>
            {isActive && (
                <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-16 
                              border-2 border-dashed border-blue-400 rounded-lg 
                              bg-blue-50/50 dark:bg-blue-900/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-1 bg-blue-400 rounded-full animate-pulse" />
                    </div>
                </div>
            )}
        </div>
    </div>
);

export default DropZone;