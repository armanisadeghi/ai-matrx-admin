"use client";
import React, { useRef, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { ContainerRenderProps } from "@/features/applet/runner/layouts/AppletLayoutManager";

const SearchField: React.FC<ContainerRenderProps> = ({
    id,
    label,
    description,
    fields,
    appletId,
    isActive,
    onClick,
    onOpenChange,
    isLast = false,
    actionButton = null,
    children,
    className = "",
    preventClose = false,
    isMobile = false,
    hideContainerPlaceholder = false,
    source = "applet",
}) => {
    const appletContainers = useAppSelector((state) => selectAppletRuntimeContainers(state, appletId));
    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    
    // Add a state to track hover timeout
    const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Handle clicks outside the component
        const handleClickOutside = (event: MouseEvent) => {
            // Only close if popover is active and click is outside the popover and button
            if (isActive && !preventClose && popoverRef.current && buttonRef.current) {
                const target = event.target as Node;
                // Check if the click is inside our popover or button
                const clickedOutsidePopover = !popoverRef.current.contains(target);
                const clickedOutsideButton = !buttonRef.current.contains(target);
                // Check if the click is inside any select dropdown or list
                const clickedInsideSelect = isClickInsideSelectDropdown(target);
                // Only close if clicked outside both the popover, button, and any select dropdowns
                if (clickedOutsidePopover && clickedOutsideButton && !clickedInsideSelect) {
                    onOpenChange(false);
                }
            }
        };

        // Helper function to detect if a click is inside any select dropdown
        const isClickInsideSelectDropdown = (node: Node): boolean => {
            // Common class names and attributes for dropdown menus in various UI libraries
            const selectSelectors = [
                '[role="listbox"]',
                '[role="menu"]',
                ".select__menu",
                ".dropdown-menu",
                ".MuiPopover-root",
                ".css-26l3qy-menu", // react-select
                ".select-dropdown",
                ".selectDropdown",
                ".select-options",
                ".dropdown-list",
                ".select-list",
            ];
            // Check if clicked element or any parent matches select dropdown selectors
            let current = node as Element;
            while (current && current !== document.body) {
                // Check if current element matches any of our select selectors
                if (
                    selectSelectors.some((selector) => {
                        if (selector.startsWith(".")) {
                            return current.classList && current.classList.contains(selector.substring(1));
                        } else {
                            return current.matches && current.matches(selector);
                        }
                    })
                ) {
                    return true;
                }
                // Also check for common tag names and data attributes
                const tagName = current.tagName?.toLowerCase();
                if (
                    tagName === "select" ||
                    current.getAttribute("data-select") === "true" ||
                    current.getAttribute("data-dropdown") === "true"
                ) {
                    return true;
                }
                // Move up to parent
                if (current.parentElement) {
                    current = current.parentElement;
                } else {
                    break;
                }
            }
            return false;
        };

        // Add event listener when popover is active
        if (isActive) {
            // Use a small delay to ensure the event doesn't immediately trigger
            // when the popover is first opened
            setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 10);
        }

        // Cleanup the event listener
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isActive, preventClose, onOpenChange]);

    // Popover style
    const popoverStyle = {
        display: isActive ? "block" : "none",
        position: "absolute" as const,
        top: "calc(100% + 8px)",
        left: isLast ? "auto" : "0",
        right: isLast ? "0" : "auto",
        zIndex: 50,
        minWidth: "320px",
        borderRadius: ".9rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    };

    // Hover handlers
    const handleMouseEnter = () => {
        if (!isActive) {
            // Add a small delay to prevent accidental triggers
            const timeout = setTimeout(() => {
                onClick(id);
            }, 200); // 300ms delay
            setHoverTimeout(timeout);
        }
    };

    const handleMouseLeave = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            setHoverTimeout(null);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
        };
    }, [hoverTimeout]);

    return (
        <div 
            className="field-container flex-1 relative rounded-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Trigger button */}
            <button
                ref={buttonRef}
                className={`flex-1 w-full h-full rounded-full text-left py-2 ${
                    hideContainerPlaceholder ? "pl-2" : "pl-6"
                } focus:outline-none transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-700 ${
                    !isLast ? "border-r dark:border-gray-700" : ""
                } ${actionButton ? "flex items-center pr-2" : ""} ${className}`}
                onClick={() => onClick(id)}
            >
                <div className={actionButton ? "flex-grow" : ""}>
                    <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">{label}</div>
                    {!hideContainerPlaceholder && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}
                </div>
                {actionButton}
            </button>
            {/* Popover content - always mounted but conditionally visible */}
            <div ref={popoverRef} style={popoverStyle} className="bg-white dark:bg-gray-800 border dark:border-gray-700">
                {children}
            </div>
        </div>
    );
};

export default SearchField;