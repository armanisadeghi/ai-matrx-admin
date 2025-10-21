"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectCanvasIsOpen, selectCanvasContent, selectCanvasWidth, setCanvasWidth } from "@/lib/redux/slices/canvasSlice";
import { CanvasRenderer } from "./CanvasRenderer";

interface AdaptiveLayoutProps {
    header?: React.ReactNode;
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    canvasPanel?: React.ReactNode; // Optional override - if not provided, uses Redux canvas
    className?: string;
    // Optional: custom breakpoint for mobile stacking (default: 950px)
    mobileBreakpoint?: number;
    // Optional: max width for left panel (default: 640px)
    leftPanelMaxWidth?: number;
    // Optional: disable automatic canvas rendering (default: false)
    disableAutoCanvas?: boolean;
}

/**
 * AdaptiveLayout - A flexible, unopinionated two-column layout with optional canvas panel
 * 
 * Features:
 * - Left panel: configurable max width (default 640px), proportional shrinking
 * - Right panel: flexible width with centered content (max 800px)
 * - Canvas panel: optional right-side panel with resizable divider
 * - Fully responsive with mobile stacking at configurable breakpoint
 * - Proportional shrinking: both panels reduce equally until mobile breakpoint
 * - NO opinionated styling (borders, padding, backgrounds) - purely structural
 */
export function AdaptiveLayout({
    header,
    leftPanel,
    rightPanel,
    canvasPanel,
    className,
    mobileBreakpoint = 950,
    leftPanelMaxWidth = 640,
    disableAutoCanvas = false,
}: AdaptiveLayoutProps) {
    const dispatch = useAppDispatch();
    const [isResizing, setIsResizing] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const mainContainerRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);

    // Get canvas state from Redux
    const isCanvasOpen = useAppSelector(selectCanvasIsOpen);
    const canvasContent = useAppSelector(selectCanvasContent);
    const reduxCanvasWidth = useAppSelector(selectCanvasWidth);

    // Determine which canvas to show: explicit prop or Redux canvas
    const effectiveCanvasPanel = canvasPanel || 
      (!disableAutoCanvas && isCanvasOpen ? <CanvasRenderer content={canvasContent} /> : undefined);
    
    const hasCanvas = !!effectiveCanvasPanel;
    const canvasWidth = reduxCanvasWidth; // Use Redux width for consistency

    // Track window width to determine mobile vs desktop
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < mobileBreakpoint);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [mobileBreakpoint]);

    // Prevent ALL auto-scrolling behavior - AGGRESSIVE approach
    useEffect(() => {
        const panels = [leftPanelRef, rightPanelRef];
        const scrollPositions = new Map<HTMLDivElement, number>();
        let isRestoring = false;

        // Continuously monitor and lock scroll positions
        const lockScrollPosition = (panel: HTMLDivElement) => {
            if (!scrollPositions.has(panel)) {
                scrollPositions.set(panel, panel.scrollTop);
            }
        };

        // Aggressively restore scroll position
        const restoreScroll = (panel: HTMLDivElement) => {
            const savedPosition = scrollPositions.get(panel);
            if (savedPosition !== undefined && panel.scrollTop !== savedPosition) {
                isRestoring = true;
                panel.scrollTop = savedPosition;
                requestAnimationFrame(() => {
                    if (panel.scrollTop !== savedPosition) {
                        panel.scrollTop = savedPosition;
                    }
                    isRestoring = false;
                });
            }
        };

        // Update saved position only during manual scrolling
        const handleScroll = (e: Event) => {
            if (isRestoring) return;
            
            const panel = e.target as HTMLDivElement;
            if (panel === leftPanelRef.current || panel === rightPanelRef.current) {
                // This is manual scrolling - update the saved position
                scrollPositions.set(panel, panel.scrollTop);
            }
        };

        // AGGRESSIVE: Lock position before focus can cause scroll
        const handleFocusCapture = (e: FocusEvent) => {
            panels.forEach(panelRef => {
                const panel = panelRef.current;
                if (panel && panel.contains(e.target as Node)) {
                    lockScrollPosition(panel);
                    
                    // Restore immediately and repeatedly to override browser scroll
                    restoreScroll(panel);
                    requestAnimationFrame(() => restoreScroll(panel));
                    setTimeout(() => restoreScroll(panel), 0);
                    setTimeout(() => restoreScroll(panel), 10);
                    setTimeout(() => restoreScroll(panel), 50);
                }
            });
        };

        // Prevent scrollIntoView calls
        const originalScrollIntoView = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function(this: Element, arg?: boolean | ScrollIntoViewOptions) {
            const isInPanel = panels.some(panelRef => panelRef.current?.contains(this));
            if (!isInPanel) {
                originalScrollIntoView.call(this, arg);
            }
        };

        // Add listeners with capture phase for earliest possible interception
        document.addEventListener('scroll', handleScroll, true);
        document.addEventListener('focusin', handleFocusCapture, true);

        return () => {
            document.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('focusin', handleFocusCapture, true);
            Element.prototype.scrollIntoView = originalScrollIntoView;
        };
    }, []);

    // Handle mouse drag for resizing canvas panel
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            
            // Calculate width from the right edge
            const newWidth = containerRect.right - e.clientX;
            
            // Constrain canvas width between 400px min and 1175px max
            const minWidth = 400;
            const maxWidth = 1175;
            const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
            
            // Update Redux state with new canvas width
            dispatch(setCanvasWidth(constrainedWidth));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, dispatch]);

    // Prevent text selection during resize
    useEffect(() => {
        if (isResizing) {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        } else {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
    }, [isResizing]);

    return (
        <div ref={mainContainerRef} className={cn("h-full flex flex-col", className)}>
            {/* Header */}
            {header && (
                <div className="flex-shrink-0">
                    {header}
                </div>
            )}

            {/* Main Content Area */}
            <div 
                className={cn(
                    "flex-1 flex",
                    isMobile ? "flex-col overflow-y-auto" : "flex-row overflow-hidden"
                )}
            >
                {/* Left Panel - equal shrinking with right panel, max at leftPanelMaxWidth */}
                <div 
                    ref={leftPanelRef}
                    className={cn(
                        isMobile ? "w-full" : "overflow-y-auto"
                    )}
                    style={isMobile ? undefined : {
                        flex: `1 1 0`,
                        maxWidth: `${leftPanelMaxWidth}px`,
                        minWidth: '300px', // Minimum width before switching to mobile
                        overflowAnchor: 'none', // Prevent browser auto-scroll
                        scrollPaddingTop: '0px', // Prevent scroll-into-view padding
                    }}
                >
                    {leftPanel}
                </div>

                {/* Right Panel - equal shrinking with left panel, no max width */}
                <div 
                    ref={containerRef}
                    className={cn(
                        "relative flex",
                        !isMobile && "overflow-hidden"
                    )}
                    style={isMobile ? undefined : {
                        flex: `1 1 0`,
                        minWidth: '400px', // Minimum width to keep content readable
                    }}
                >
                    {/* Content Area */}
                    <div 
                        ref={rightPanelRef}
                        className={cn(
                            "flex-1",
                            !isMobile && "overflow-y-auto"
                        )}
                        style={{
                            ...(hasCanvas && !isMobile ? { marginRight: `${canvasWidth}px` } : {}),
                            ...(!isMobile ? {
                                overflowAnchor: 'none',
                                scrollPaddingTop: '0px',
                            } : {})
                        }}
                    >
                        {/* Content wrapper - Always enforce max-width for readability */}
                        <div className="h-full max-w-[800px] mx-auto">
                            {rightPanel}
                        </div>
                    </div>

                    {/* Canvas Panel - optional, right side (desktop only) */}
                    {hasCanvas && !isMobile && (
                        <>
                            {/* Resizer Handle - Delicate, minimalistic design */}
                            <div
                                className={cn(
                                    "absolute top-0 bottom-0 w-px cursor-col-resize z-10",
                                    "bg-gray-300 dark:bg-gray-700"
                                )}
                                style={{
                                    right: `${canvasWidth}px`,
                                }}
                                onMouseDown={() => setIsResizing(true)}
                            />

                            {/* Canvas Panel */}
                            <div
                                className="absolute top-0 bottom-0 right-0 overflow-y-auto"
                                style={{
                                    width: `${canvasWidth}px`,
                                }}
                            >
                                {effectiveCanvasPanel}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

