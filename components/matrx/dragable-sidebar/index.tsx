// File: components/AdjustableSidebar.tsx

import React, {useState, useCallback, useEffect} from 'react';

interface DraggableSidebarProps {
    children: React.ReactNode;
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    className?: string;
    isMobile?: boolean;
}

export function DraggableSidebar(
    {
        children,
        initialWidth = 250,
        minWidth = 50,
        maxWidth = 500,
        className = '',
        isMobile = false,
    }: DraggableSidebarProps) {
    const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (isDragging) {
                const newWidth = e.clientX;
                setSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
            }
        },
        [isDragging, minWidth, maxWidth]
    );

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    if (isMobile) {
        return (
            <div className={`bg-background w-full ${className}`}>
                {children}
            </div>
        );
    }

    return (
        <div
            className={`relative bg-background h-full ${className}`}
            style={{width: `${sidebarWidth}px`, minWidth: `${minWidth}px`, maxWidth: `${maxWidth}px`}}
        >
            <div className="h-full overflow-hidden border-r border-border">
                {children}
            </div>
            <div
                className="absolute top-0 right-0 w-1 h-full bg-border cursor-col-resize"
                onMouseDown={handleMouseDown}
            />
        </div>
    );
}
