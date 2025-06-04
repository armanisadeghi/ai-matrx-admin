import React from "react";
import { useState } from "react";

export function ResizableJsonContainer({
    children,
    initialHeight = 200,
    minHeight = 120,
}: {
    children: React.ReactNode;
    initialHeight?: number;
    minHeight?: number;
}) {
    const [height, setHeight] = useState(initialHeight);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const newHeight = Math.max(minHeight, height + e.movementY);
        setHeight(newHeight);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add event listeners when dragging
    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [isDragging, height]);

    return (
        <div className="relative">
            <div className="overflow-y-auto" style={{ height: `${height}px` }}>
                {children}
            </div>
            {/* Resize handle */}
            <div
                className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 cursor-ns-resize flex items-center justify-center transition-colors"
                onMouseDown={handleMouseDown}
            >
                <div className="w-8 h-1 bg-gray-400 dark:bg-gray-300 rounded-full"></div>
            </div>
        </div>
    );
}

export default ResizableJsonContainer;
