"use client"

import { useCallback, useState, useRef, CSSProperties, FC } from 'react';
import { IconX, IconMaximize, IconMinimize } from '@tabler/icons-react';
import { PanelProps } from '../types';

export const Panel: FC<PanelProps> = ({
                                                id,
                                                config,
                                                state,
                                                children,
                                                onResize,
                                                onVisibilityChange,
                                                onFocus
                                            }) => {
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const resizeRef = useRef<number>(state.size);
    const { group, title, icon: Icon, minSize, maxSize } = config;

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startSize = resizeRef.current;
        const startPos = group === 'bottom' ? e.clientY : e.clientX;

        const handleMouseMove = (e: MouseEvent) => {
            const currentPos = group === 'bottom' ? e.clientY : e.clientX;
            let diff;

            // Calculate difference based on panel group
            if (group === 'right') {
                diff = startPos - currentPos;  // Right panel: drag left to increase
            } else if (group === 'bottom') {
                diff = startPos - currentPos;  // Bottom panel: drag up to increase
            } else {
                diff = currentPos - startPos;  // Left panel: drag right to increase
            }

            const newSize = Math.max(
                minSize,
                maxSize ? Math.min(maxSize, startSize + diff) : startSize + diff
            );

            resizeRef.current = newSize;
            onResize?.(newSize);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [group, minSize, maxSize, onResize]);

    const paneStyles: CSSProperties = {
        width: group === 'bottom' ? '100%' : `${state.size}px`,
        height: group === 'bottom' ? `${state.size}px` : '100%',
        minWidth: group === 'bottom' ? '100%' : `${minSize}px`,
        minHeight: group === 'bottom' ? `${minSize}px` : '100%',
        ...(isMaximized ? {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            zIndex: 50
        } : {})
    };

    const resizerPosition = {
        left: group === 'right' ? 0 : undefined,
        right: group === 'left' ? 0 : undefined,
        top: group === 'bottom' ? 0 : undefined,
        cursor: group === 'bottom' ? 'row-resize' : 'col-resize',
    };

    const handleClose = () => {
        onVisibilityChange?.(false);
    };

    const handleMaximize = () => {
        setIsMaximized(!isMaximized);
    };

    return (
        <div
            className="relative flex flex-col bg-neutral-900"
            style={paneStyles}
            onClick={() => onFocus?.()}
        >
            {/* Only show title bar for non-bottom panels */}
            {group !== 'bottom' && (
                <div className="h-8 px-2 flex items-center justify-between border-b border-neutral-700">
                    <div className="flex items-center gap-2">
                        <Icon size={16} />
                        <span className="text-sm font-medium">{title}</span>
                    </div>
                    <div className="flex items-center">
                        <button
                            className="p-1 hover:bg-neutral-800 rounded"
                            onClick={handleMaximize}
                            title={isMaximized ? 'Restore' : 'Maximize'}
                        >
                            {isMaximized ? <IconMinimize size={14} /> : <IconMaximize size={14} />}
                        </button>
                        <button
                            className="p-1 hover:bg-neutral-800 rounded"
                            onClick={handleClose}
                            title="Close"
                        >
                            <IconX size={14} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                {children}
            </div>

            {!isMaximized && (
                <div
                    className={`absolute hover:bg-blue-500 transition-colors z-10 opacity-0 hover:opacity-100
            ${group === 'bottom' ? 'w-full h-1 top-0' : 'w-1 h-full'}`}
                    style={resizerPosition}
                    onMouseDown={handleMouseDown}
                />
            )}
        </div>
    );
};