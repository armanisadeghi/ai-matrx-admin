import React, { useState, useEffect, ComponentProps, ReactNode } from 'react';
import { IconGripVertical, IconGripHorizontal } from '@tabler/icons-react';

interface PanelProps extends ComponentProps<"div"> {
    children?: ReactNode;
    className?: string;
}

interface SplitPanelProps extends PanelProps {
    direction?: 'vertical' | 'horizontal';
    initialSizes?: number[];
    minSize?: number;
    maxSize?: number;
}

const ResizeHandle = ({
                          direction = 'vertical',
                          className = "",
                          onMouseDown
                      }: {
    direction?: 'vertical' | 'horizontal';
    className?: string;
    onMouseDown: () => void;
}) => {
    const Icon = direction === 'vertical' ? IconGripVertical : IconGripHorizontal;
    const cursorClass = direction === 'vertical' ? 'cursor-col-resize' : 'cursor-row-resize';
    const dimensionClass = direction === 'vertical' ? 'w-2' : 'h-2';

    return (
        <div
            className={`flex items-center justify-center ${dimensionClass} hover:bg-neutral-700 ${cursorClass} active:bg-neutral-600 transition-colors ${className}`}
            onMouseDown={onMouseDown}
        >
            <Icon size={16} className="text-neutral-400" />
        </div>
    );
};

export const SplitPanel = ({
                               children,
                               direction = 'vertical',
                               initialSizes = [50, 50],
                               minSize = 10,
                               maxSize = 90,
                               className = "",
                               ...others
                           }: SplitPanelProps) => {
    const [sizes, setSizes] = useState(initialSizes);
    const [isResizing, setIsResizing] = useState<number | null>(null);
    const [startPosition, setStartPosition] = useState(0);
    const [startSizes, setStartSizes] = useState<number[]>([]);

    const handleResizeStart = (index: number, e: React.MouseEvent) => {
        setIsResizing(index);
        setStartPosition(direction === 'vertical' ? e.clientX : e.clientY);
        setStartSizes([...sizes]);
    };

    const handleResizeEnd = () => {
        setIsResizing(null);
    };

    useEffect(() => {
        if (isResizing !== null) {
            const handleResize = (e: MouseEvent) => {
                if (isResizing === null || !startSizes) return;

                const currentPosition = direction === 'vertical' ? e.clientX : e.clientY;
                const containerSize = direction === 'vertical' ?
                    window.innerWidth :
                    window.innerHeight;
                const deltaPixels = currentPosition - startPosition;
                const deltaPercentage = (deltaPixels / containerSize) * 100;

                const newSizes = [...startSizes];
                newSizes[isResizing] = Math.min(
                    Math.max(startSizes[isResizing] + deltaPercentage, minSize),
                    maxSize
                );
                newSizes[isResizing + 1] = Math.min(
                    Math.max(startSizes[isResizing + 1] - deltaPercentage, minSize),
                    maxSize
                );

                setSizes(newSizes);
            };

            window.addEventListener('mousemove', handleResize);
            window.addEventListener('mouseup', handleResizeEnd);

            return () => {
                window.removeEventListener('mousemove', handleResize);
                window.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [isResizing, startPosition, startSizes, direction, minSize, maxSize]);

    // Convert array of children to array for proper handling
    const childrenArray = React.Children.toArray(children);

    return (
        <div
            className={`flex ${direction === 'vertical' ? 'flex-row' : 'flex-col'} ${className}`}
            {...others}
        >
            {childrenArray.map((child, index) => (
                <React.Fragment key={index}>
                    <div
                        style={{
                            flex: `0 0 ${sizes[index]}%`,
                            overflow: 'auto'
                        }}
                        className="h-full"
                    >
                        {child}
                    </div>
                    {index < childrenArray.length - 1 && (
                        <ResizeHandle
                            direction={direction}
                            className={`${direction === 'vertical' ? 'border-x' : 'border-y'} border-neutral-700`}
                            onMouseDown={() => handleResizeStart(index, event as React.MouseEvent)}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};