"use client";
import React, { useState, useEffect, ReactNode, useCallback, useRef } from "react";

// Define type for the component props
interface FloatingSheetProps {
    children: ReactNode;
    isOpen: boolean;
    onClose: () => void;
    title?: string | ReactNode;
    description?: string | ReactNode;
    footer?: ReactNode;
    footerContent?: ReactNode; // Alternative to footer for consistency with headerContent
    headerContent?: ReactNode; // Additional content to render in the header
    position?: "right" | "left" | "top" | "bottom" | "center";
    showCloseButton?: boolean;
    closeOnBackdropClick?: boolean;
    closeOnEsc?: boolean; // New: Close the sheet when ESC key is pressed
    width?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";
    height?: "auto" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";
    spacing?: string;
    rounded?: string;
    className?: string;
    contentClassName?: string;
    headerClassName?: string; // New: Class name for the header
    footerClassName?: string; // New: Class name for the footer
    backdropClassName?: string; // New: Class name for the backdrop
    initialFocus?: boolean; // New: Automatically focus the sheet when opened
    lockScroll?: boolean; // New: Whether to lock body scroll when opened
    animationDuration?: number; // New: Custom animation duration in ms
    preserveScrollPosition?: boolean; // New: Preserve scroll position when reopening
    closeButton?: ReactNode; // New: Custom close button element
    role?: string; // New: ARIA role (defaults to "dialog")
    hasBackdrop?: boolean; // New: Whether to show a backdrop behind the sheet
    onBackdropClick?: () => void; // New: Handler for backdrop clicks
}

const FloatingSheet: React.FC<FloatingSheetProps> = ({
    children,
    isOpen,
    onClose,
    title = "Sheet Title",
    description,
    footer,
    footerContent,
    headerContent,
    position = "right",
    showCloseButton = true,
    closeOnBackdropClick = true,
    closeOnEsc = true, // Default to true for better accessibility
    width = "md",
    height = "auto",
    spacing = "4",
    rounded = "2xl",
    className = "",
    contentClassName = "",
    headerClassName = "",
    footerClassName = "",
    backdropClassName = "",
    initialFocus = true,
    lockScroll = true,
    animationDuration = 300,
    preserveScrollPosition = true,
    closeButton,
    role = "dialog",
    hasBackdrop = true,
    onBackdropClick,
}) => {
    // Create a state to track if the component has been initially rendered
    const [hasRendered, setHasRendered] = useState(false);

    // Refs for focusing and scroll preservation
    const sheetRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scrollPosition, setScrollPosition] = useState(0);

    // Handle initial render
    useEffect(() => {
        if (!hasRendered) {
            setHasRendered(true);
        }
    }, []);

    // Handle body scroll locking when sheet is open
    useEffect(() => {
        if (!lockScroll) return;

        if (isOpen) {
            // Store current scroll position before locking
            const scrollY = window.scrollY;
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
            document.body.style.top = `-${scrollY}px`;
            document.body.style.overflow = "hidden";
        } else {
            // Restore scroll position after unlocking
            const scrollY = document.body.style.top;
            document.body.style.position = "";
            document.body.style.width = "";
            document.body.style.top = "";
            document.body.style.overflow = "";
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
            }
        }

        return () => {
            document.body.style.position = "";
            document.body.style.width = "";
            document.body.style.top = "";
            document.body.style.overflow = "";
        };
    }, [isOpen, lockScroll]);

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && closeOnEsc) {
                onClose();
            }
        };

        if (isOpen && closeOnEsc) {
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, closeOnEsc, onClose]);

    // Handle focus management for accessibility
    useEffect(() => {
        if (isOpen && initialFocus && sheetRef.current) {
            sheetRef.current.focus();
        }
    }, [isOpen, initialFocus]);

    // Handle scroll position preservation
    useEffect(() => {
        if (isOpen && contentRef.current && preserveScrollPosition) {
            contentRef.current.scrollTop = scrollPosition;
        }
    }, [isOpen, preserveScrollPosition, scrollPosition]);

    // Save scroll position when closing
    useEffect(() => {
        if (!isOpen && contentRef.current && preserveScrollPosition) {
            setScrollPosition(contentRef.current.scrollTop);
        }
    }, [isOpen, preserveScrollPosition]);

    // Function to close the sheet when clicking backdrop
    const handleBackdropClick = useCallback(() => {
        if (onBackdropClick) {
            onBackdropClick();
        } else if (closeOnBackdropClick) {
            onClose();
        }
    }, [closeOnBackdropClick, onClose, onBackdropClick]);

    // Determine max width based on the width prop
    const getWidthClass = () => {
        const widthMap: Record<string, string> = {
            sm: "max-w-sm",
            md: "max-w-md",
            lg: "max-w-lg",
            xl: "max-w-xl",
            "2xl": "max-w-2xl",
            "3xl": "max-w-3xl",
            "4xl": "max-w-4xl",
            full: "max-w-full",
        };

        // For top/bottom positions, use full width by default unless explicitly set
        if ((position === "top" || position === "bottom") && width === "md") {
            return "max-w-full";
        }

        return widthMap[width] || "max-w-md";
    };

    // Determine height for top/bottom/center positions
    const getHeightClass = () => {
        // Only apply height constraints for top, bottom, or center positions
        if (position === "right" || position === "left") {
            return "";
        }

        const heightMap: Record<string, string> = {
            sm: "max-h-sm",
            md: "max-h-md",
            lg: "max-h-lg",
            xl: "max-h-xl",
            "2xl": "max-h-2xl",
            "3xl": "max-h-3xl",
            "4xl": "max-h-4xl",
            full: "max-h-full",
            auto: position === "center" ? "max-h-[85vh]" : "max-h-[50vh]", // Default reasonable heights
        };

        return heightMap[height] || heightMap.auto;
    };

    // Determine position classes
    const getPositionClasses = () => {
        const positionMap: Record<string, string> = {
            right: `top-${spacing} bottom-${spacing} right-${spacing}`,
            left: `top-${spacing} bottom-${spacing} left-${spacing}`,
            top: `top-${spacing} left-${spacing} right-${spacing}`,
            bottom: `bottom-${spacing} left-${spacing} right-${spacing}`,
            center: "inset-0 flex items-center justify-center", // For centered modal style
        };

        return positionMap[position] || `top-${spacing} bottom-${spacing} right-${spacing}`;
    };

    // Determine transform classes for animations
    const getTransformClass = () => {
        const transformMap: Record<string, string> = {
            right: isOpen ? "translate-x-0" : "translate-x-full",
            left: isOpen ? "translate-x-0" : "-translate-x-full",
            top: isOpen ? "translate-y-0" : "-translate-y-full",
            bottom: isOpen ? "translate-y-0" : "translate-y-full",
            center: isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0", // Scale + fade for center modal
        };

        return transformMap[position] || (isOpen ? "translate-x-0" : "translate-x-full");
    };

    const positionClasses = getPositionClasses();
    const widthClass = getWidthClass();
    const heightClass = getHeightClass();
    const transformClass = getTransformClass();

    // Determine if we need to show the header
    const showHeader = title || showCloseButton || headerContent;

    // Determine if we need to show the footer
    const showFooter = footer || footerContent;

    // CRITICAL: We always render the sheet regardless of isOpen state
    // This ensures state is preserved inside sheet contents
    return (
        <>
            {/* Backdrop - Only shown when open */}
            {isOpen && hasBackdrop && (
                <div
                    className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-${animationDuration} ${backdropClassName}`}
                    onClick={handleBackdropClick}
                    aria-hidden="true"
                    data-testid="floating-sheet-backdrop"
                />
            )}

            {/* Sheet - Always rendered but visibility and position controlled by CSS */}
            <div
                ref={sheetRef}
                className={`fixed ${positionClasses} z-50 ${
                    position === "center" ? "" : "w-full"
                } ${widthClass} ${heightClass} rounded-${rounded} bg-white dark:bg-slate-900 shadow-lg transform transition-all duration-${animationDuration} ease-in-out ${transformClass} ${
                    isOpen ? "visible opacity-100" : "invisible opacity-0"
                } h-full outline-none ${className}`}
                role={role}
                aria-modal={isOpen}
                aria-hidden={!isOpen}
                aria-labelledby="sheet-title"
                tabIndex={-1}
                data-testid="floating-sheet"
            >
                <div className="flex flex-col h-full">
                    {/* Header - Only show if title exists or showCloseButton is true or headerContent exists */}
                    {showHeader && (
                        <div
                            className={`flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3 ${headerClassName}`}
                        >
                            <div className="flex-1 min-w-0">
                                {typeof title === "string" ? (
                                    <h2 id="sheet-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {title}
                                    </h2>
                                ) : (
                                    <div id="sheet-title">{title}</div>
                                )}

                                {description &&
                                    (typeof description === "string" ? (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                                    ) : (
                                        <div className="mt-1">{description}</div>
                                    ))}
                            </div>

                            {headerContent && <div className="ml-4 flex items-center">{headerContent}</div>}

                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className="ml-4 rounded-full p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                                    aria-label="Close"
                                    data-testid="floating-sheet-close"
                                >
                                    {closeButton || (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Content area */}
                    <div ref={contentRef} className={`flex-1 overflow-y-auto ${contentClassName}`} data-testid="floating-sheet-content">
                        {children}
                    </div>

                    {/* Footer - Only render if provided */}
                    {showFooter && (
                        <div
                            className={`border-t border-gray-200 dark:border-gray-700 px-4 pt-2 pb-6 ${footerClassName}`}
                            data-testid="floating-sheet-footer"
                        >
                            {footer || footerContent}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default FloatingSheet;
