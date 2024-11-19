import React, {useState, useCallback, useEffect} from 'react';
import {cn} from '@/lib/utils';
import {GripVertical} from 'lucide-react';

interface ResizablePanelProps {
    children: React.ReactNode;
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    onResize?: (size: number) => void;
    className?: string;
    direction?: 'horizontal' | 'vertical';
    side?: 'left' | 'right';
    updatedSize?: number;  // New prop for programmatic updates
}

const ResizablePanel = (
    {
        children,
        defaultSize = 320,
        minSize = 240,
        maxSize = 480,
        onResize,
        className,
        direction = 'horizontal',
        side = 'right',
        updatedSize
    }: ResizablePanelProps) => {
    const [isResizing, setIsResizing] = useState(false);
    const [size, setSize] = useState(defaultSize);

    // Separate effect for handling programmatic size updates
    useEffect(() => {
        if (updatedSize !== undefined) {
            const newSize = Math.max(minSize, Math.min(maxSize, updatedSize));
            setSize(newSize);
            onResize?.(newSize);
        }
    }, [updatedSize, minSize, maxSize, onResize]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startSize = size;
        const startPosition = direction === 'horizontal' ? e.pageX : e.pageY;

        const handleMouseMove = (e: MouseEvent) => {
            const currentPosition = direction === 'horizontal' ? e.pageX : e.pageY;
            const difference = side === 'right'
                               ? currentPosition - startPosition
                               : startPosition - currentPosition;

            const newSize = Math.max(minSize, Math.min(maxSize, startSize + difference));

            setSize(newSize);
            onResize?.(newSize);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [size, minSize, maxSize, onResize, direction, side]);

    return (
        <div
            className={cn(
                'relative flex',
                direction === 'horizontal' ? 'flex-row' : 'flex-col',
                className
            )}
            style={{
                [direction === 'horizontal' ? 'width' : 'height']: size,
                flexShrink: 0
            }}
        >
            {side === 'left' && (
                <div
                    className={cn(
                        'absolute flex items-center justify-center',
                        'left-0 top-0 h-full w-2 cursor-col-resize',
                        isResizing && 'bg-primary/10'
                    )}
                    onMouseDown={handleMouseDown}
                >
                    <GripVertical
                        className={cn(
                            'h-4 w-4 text-muted-foreground/40',
                            isResizing && 'text-primary'
                        )}
                    />
                </div>
            )}
            <div className="flex-1 overflow-hidden">{children}</div>
            {side === 'right' && (
                <div
                    className={cn(
                        'absolute flex items-center justify-center',
                        'right-0 top-0 h-full w-2 cursor-col-resize',
                        isResizing && 'bg-primary/10'
                    )}
                    onMouseDown={handleMouseDown}
                >
                    <GripVertical
                        className={cn(
                            'h-4 w-4 text-muted-foreground/40',
                            isResizing && 'text-primary'
                        )}
                    />
                </div>
            )}
        </div>
    );
};

export default ResizablePanel;
