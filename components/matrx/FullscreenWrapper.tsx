"use client";
import React, { useState, useRef, useEffect, ReactNode } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

interface FullscreenWrapperProps {
  children: ReactNode;
  className?: string;
  buttonPosition?: "top-right" | "top-right-inside" | "top-left" | "bottom-right" | "bottom-left";
  expandButtonTitle?: string;
  closeButtonTitle?: string;
  showCloseButton?: boolean;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
}

const FullscreenWrapper: React.FC<FullscreenWrapperProps> = ({
  children,
  className = "",
  buttonPosition = "top-right",
  expandButtonTitle = "Expand to fullscreen",
  closeButtonTitle = "Exit fullscreen",
  showCloseButton = true,
  onEnterFullscreen,
  onExitFullscreen,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        exitFullscreen();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [isFullscreen]);

  const enterFullscreen = () => {
    setIsFullscreen(true);
    if (onEnterFullscreen) onEnterFullscreen();
    // Prevent body scrolling when in fullscreen
    document.body.style.overflow = "hidden";
  };

  const exitFullscreen = () => {
    setIsFullscreen(false);
    if (onExitFullscreen) onExitFullscreen();
    // Restore body scrolling when exiting fullscreen
    document.body.style.overflow = "";
  };

  // Position classes for the controls
  const positionClasses = {
    "top-right": "top-2 right-2",
    "top-right-inside": "top-2 right-10",
    "top-left": "top-2 left-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {!isFullscreen && (
        <button
          onClick={enterFullscreen}
          className={`absolute z-10 p-1.5 rounded-md bg-transparent hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition-colors ${
            positionClasses[buttonPosition]
          }`}
          title={expandButtonTitle}
          aria-label={expandButtonTitle}
        >
          <Maximize2 size={18} />
        </button>
      )}

      {isFullscreen ? (
        <div className="fixed inset-0 z-50 bg-white dark:bg-neutral-900 flex flex-col overflow-auto">
          <div className="sticky top-0 z-10 flex justify-between items-center p-2 bg-neutral-100 dark:bg-neutral-800 shadow-md">
            <div className="text-neutral-700 dark:text-neutral-200 font-medium px-2">
              {/* You could add a title here if needed */}
            </div>
            <div className="flex gap-2">
              <button
                onClick={exitFullscreen}
                className="p-1.5 rounded-md bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                title={closeButtonTitle}
                aria-label={closeButtonTitle}
              >
                <Minimize2 size={18} />
              </button>
              {showCloseButton && (
                <button
                  onClick={exitFullscreen}
                  className="p-1.5 rounded-md bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                  title="Close"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default FullscreenWrapper;