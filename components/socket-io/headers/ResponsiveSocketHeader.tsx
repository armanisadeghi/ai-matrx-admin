"use client";
import React, { useState, useEffect } from "react";
import { SocketHeaderFull } from "./SocketHeaderFull";
import SocketHeaderCompact from "./SocketHeaderCompact";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";

interface ResponsiveSocketHeaderProps {
    onTestModeChange?: (testMode: boolean) => void;
    onConnectionSelect?: (connectionId: string) => void;
    onTaskCreate?: (taskId: string) => void;
    debugMode?: boolean;
    scrollThreshold?: number;
}

export function ResponsiveSocketHeader({
    onTestModeChange,
    onConnectionSelect,
    onTaskCreate,
    debugMode = false,
    scrollThreshold = 100 // Default scroll threshold
}: ResponsiveSocketHeaderProps) {
    const [isCompact, setIsCompact] = useState(false);
    const [autoMode, setAutoMode] = useState(true);
    
    // Handle automatic mode changes based on scroll position
    useEffect(() => {
        // Only apply auto switching if autoMode is true
        if (!autoMode) return;

        const handleScroll = () => {
            // Switch to compact mode when scrolling past threshold
            if (window.scrollY > scrollThreshold) {
                setIsCompact(true);
            } else {
                setIsCompact(false);
            }
        };
        
        // Add scroll event listener
        window.addEventListener("scroll", handleScroll);
        
        // Check initial scroll position
        handleScroll();
        
        // Clean up event listener on unmount
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [scrollThreshold, autoMode]);
    
    // Add responsive listener for small screens
    useEffect(() => {
        // Only apply auto switching if autoMode is true
        if (!autoMode) return;

        const handleResize = () => {
            // Always use compact mode on small screens (< 768px)
            if (window.innerWidth < 768) {
                setIsCompact(true);
            } else if (window.scrollY <= scrollThreshold) {
                // Revert to full size if we're above scroll threshold and screen is large enough
                setIsCompact(false);
            }
        };
        
        // Add resize event listener
        window.addEventListener("resize", handleResize);
        
        // Check initial size
        handleResize();
        
        // Clean up event listener on unmount
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [scrollThreshold, autoMode]);

    // Toggle between compact and full modes manually
    const toggleCompactMode = () => {
        // Disable auto mode when manually toggling
        setAutoMode(false);
        setIsCompact(!isCompact);
    };
    
    // Re-enable auto mode
    const enableAutoMode = () => {
        setAutoMode(true);
    };
    
    // Custom props for header components that include auto mode info
    const customHeaderProps = {
        onTestModeChange,
        onConnectionSelect,
        onTaskCreate,
        debugMode,
        autoMode,
        onToggleAutoMode: enableAutoMode
    };
    
    return (
        <div className={isCompact ? "sticky top-0 z-50 transition-all duration-300" : ""}>
            <div className="relative">
                {isCompact ? (
                    <div className="flex items-center">
                        <div className="flex-1">
                            <SocketHeaderCompact
                                {...customHeaderProps}
                                onToggleExpand={toggleCompactMode}
                            />
                        </div>
                        
                        {/* Auto mode toggle shown outside the header component, but aligned with it */}
                        {!autoMode && (
                            <Button
                                onClick={enableAutoMode}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-full flex-shrink-0 ml-2"
                                title="Enable automatic responsive mode"
                            >
                                <RotateCcw className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-start">
                        <div className="flex-1">
                            <SocketHeaderFull
                                {...customHeaderProps}
                                onToggleCompress={toggleCompactMode}
                            />
                        </div>
                        
                        {/* Auto mode toggle shown outside the header component, but aligned with it */}
                        {!autoMode && (
                            <Button
                                onClick={enableAutoMode}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full flex-shrink-0 ml-2 mt-2"
                                title="Enable automatic responsive mode"
                            >
                                <RotateCcw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ResponsiveSocketHeader; 