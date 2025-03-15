import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import ToggleButton from "./ToggleButton"; // Import the base ToggleButton
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search } from "lucide-react";

type ToggleMenuDirection = "top" | "bottom" | "left" | "right";
type ToggleMenuSize = "sm" | "md" | "lg";
type SelectionMode = "single" | "multiple";

// Option type for menu items
interface ToggleMenuOption {
    id: string;
    label: string;
    icon?: React.ReactElement<{ size?: number; className?: string }>;
    disabled?: boolean;
}

interface ToggleMenuButtonProps extends Omit<React.ComponentProps<typeof ToggleButton>, "onClick" | "isEnabled"> {
    options: ToggleMenuOption[];
    onSelectionChange: (selectedIds: string[]) => void;
    selectedIds?: string[];
    direction?: ToggleMenuDirection;
    size?: ToggleMenuSize;
    selectionMode?: SelectionMode;
    enableSearch?: boolean;
    menuClassName?: string;
    optionClassName?: string;
    zIndex?: number;
    maxHeight?: string;
    minWidth?: string;
}

const ToggleMenuButton: React.FC<ToggleMenuButtonProps> = ({
    options,
    onSelectionChange,
    selectedIds = [],
    direction = "bottom",
    size = "md",
    selectionMode = "single",
    enableSearch = false,
    menuClassName,
    optionClassName,
    zIndex = 50,
    maxHeight = "200px",
    minWidth = "160px",
    ...toggleButtonProps
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);

    // Handle selection change
    const handleSelect = (optionId: string) => {
        if (selectionMode === "single") {
            // Single selection mode
            onSelectionChange([optionId]);
            setIsOpen(false);
        } else {
            // Multiple selection mode
            const newSelection = selectedIds.includes(optionId) ? selectedIds.filter((id) => id !== optionId) : [...selectedIds, optionId];
            onSelectionChange(newSelection);
        }
    };

    // Filter options based on search query
    const filteredOptions = searchQuery
        ? options.filter((option) => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                buttonRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Get appropriate chevron based on direction
    const getChevron = () => {
        switch (direction) {
            case "top":
                return <ChevronUp size={14} />;
            case "bottom":
                return <ChevronDown size={14} />;
            case "left":
                return <ChevronLeft size={14} />;
            case "right":
                return <ChevronRight size={14} />;
            default:
                return <ChevronDown size={14} />;
        }
    };

    // Calculate menu position
    const getMenuPosition = () => {
        switch (direction) {
            case "top":
                return "bottom-full mb-1";
            case "bottom":
                return "top-full mt-1";
            case "left":
                return "right-full mr-1";
            case "right":
                return "left-full ml-1";
            default:
                return "top-full mt-1";
        }
    };

    // Get menu size classes
    const getMenuSizeClasses = () => {
        switch (size) {
            case "sm":
                return "text-xs py-1";
            case "lg":
                return "text-base py-2";
            default:
                return "text-sm py-1.5";
        }
    };

    return (
        <div ref={buttonRef} className="relative inline-block">
            {/* Base Toggle Button */}
            <ToggleButton {...toggleButtonProps} isEnabled={selectedIds.length > 0} onClick={() => setIsOpen((prev) => !prev)} />

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    ref={menuRef}
                    className={cn(
                        "absolute bg-white dark:bg-zinc-800 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-700",
                        getMenuPosition(),
                        getMenuSizeClasses(),
                        "overflow-hidden z-[" + zIndex + "]",
                        menuClassName
                    )}
                    style={{
                        maxHeight: maxHeight,
                        minWidth: minWidth,
                    }}
                >
                    {/* Search Input */}
                    {enableSearch && (
                        <div className="px-2 pb-1 pt-2 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 bg-white dark:bg-zinc-800">
                            <div className="relative">
                                <Search
                                    size={14}
                                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
                                />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full bg-zinc-100 dark:bg-zinc-700 border-none rounded-md py-1 pl-7 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Options List */}
                    <div className="overflow-y-auto" style={{ maxHeight }}>
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">No options found</div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.id}
                                    onClick={() => !option.disabled && handleSelect(option.id)}
                                    className={cn(
                                        "px-3 py-1.5 flex items-center gap-2 cursor-pointer",
                                        option.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-100 dark:hover:bg-zinc-700",
                                        selectedIds.includes(option.id) &&
                                            "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200",
                                        optionClassName
                                    )}
                                >
                                    {option.icon && <span className="flex-shrink-0">{React.cloneElement(option.icon, { size: 16 })}</span>}
                                    <span className="truncate flex-1">{option.label}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToggleMenuButton;
