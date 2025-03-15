import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import ToggleButton from "@/components/matrx/toggles/ToggleButton";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search } from "lucide-react";

type ToggleMenuDirection = "top" | "bottom" | "left" | "right";
type ToggleMenuSize = "sm" | "md" | "lg";
type SelectionMode = "single" | "multiple";

// Base option interface for all selectable items
interface BaseOption {
    id: string;
    label: string;
    icon?: React.ReactElement<{ size?: number; className?: string }>;
    disabled?: boolean;
}

// Flat option for simple selections
interface ToggleMenuOption extends BaseOption {}

// Category with nested items
interface ToggleMenuCategory extends BaseOption {
    items: (ToggleMenuOption | ToggleMenuCategory)[];
}

// Type for hierarchical structure - can be a flat option or a nested category
type HierarchicalOption = ToggleMenuOption | ToggleMenuCategory;

// Type guard to check if an option is a category
const isCategory = (option: HierarchicalOption): option is ToggleMenuCategory => {
    return "items" in option && Array.isArray((option as ToggleMenuCategory).items);
};

interface ToggleMenuButtonProps extends Omit<React.ComponentProps<typeof ToggleButton>, "onClick" | "isEnabled"> {
    // Support both flat and hierarchical options
    options?: HierarchicalOption[];
    onSelectionChange: (selectedIds: string[]) => void;
    selectedIds?: string[];
    direction?: ToggleMenuDirection;
    size?: ToggleMenuSize;
    selectionMode?: SelectionMode;
    enableSearch?: boolean;
    menuClassName?: string;
    optionClassName?: string;
    categoryClassName?: string;
    zIndex?: number;
    maxHeight?: string;
    minWidth?: string;
    showIcons?: boolean;
    collapsibleCategories?: boolean;
    defaultExpandedCategories?: boolean;
    showHierarchy?: boolean; // If true, shows full hierarchy in selection display
}

const HierarchicalToggleMenu: React.FC<ToggleMenuButtonProps> = ({
    options = [],
    onSelectionChange,
    selectedIds = [],
    direction = "bottom",
    size = "md",
    selectionMode = "single",
    enableSearch = false,
    menuClassName,
    optionClassName,
    categoryClassName,
    zIndex = 50,
    maxHeight = "300px",
    minWidth = "200px",
    showIcons = true,
    collapsibleCategories = true,
    defaultExpandedCategories = true,
    showHierarchy = false,
    ...toggleButtonProps
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);

    // Initialize expanded state for categories
    useEffect(() => {
        if (options.length > 0) {
            const initialExpandedState: Record<string, boolean> = {};

            // Recursive function to process all levels of hierarchy
            const processOptions = (opts: HierarchicalOption[]) => {
                opts.forEach((opt) => {
                    if (isCategory(opt)) {
                        initialExpandedState[opt.id] = defaultExpandedCategories;
                        processOptions(opt.items);
                    }
                });
            };

            processOptions(options);
            setExpandedCategories(initialExpandedState);
        }
    }, [options, defaultExpandedCategories]);

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

    // Toggle category expanded state
    const toggleCategory = (categoryId: string, event: React.MouseEvent) => {
        if (collapsibleCategories) {
            event.stopPropagation(); // Prevent category click from selecting
            setExpandedCategories((prev) => ({
                ...prev,
                [categoryId]: !prev[categoryId],
            }));
        }
    };

    // Filter options recursively based on search query
    const filterHierarchicalOptions = (opts: HierarchicalOption[], query: string): HierarchicalOption[] => {
        return opts.reduce<HierarchicalOption[]>((filtered, opt) => {
            if (isCategory(opt)) {
                // For categories, filter their items and include the category if it has matching items
                const filteredItems = filterHierarchicalOptions(opt.items, query);
                const matchesQuery = opt.label.toLowerCase().includes(query.toLowerCase());

                if (filteredItems.length > 0 || matchesQuery) {
                    filtered.push({
                        ...opt,
                        items: filteredItems,
                    });
                }
            } else {
                // For flat options, just check if they match the query
                if (opt.label.toLowerCase().includes(query.toLowerCase())) {
                    filtered.push(opt);
                }
            }

            return filtered;
        }, []);
    };

    const filteredOptions = searchQuery ? filterHierarchicalOptions(options, searchQuery) : options;

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

    // Recursively render options and categories
    const renderOptions = (opts: HierarchicalOption[], depth: number = 0) => {
        return opts.map((opt) => {
            if (isCategory(opt)) {
                return (
                    <div key={opt.id} className={depth > 0 ? "border-t border-zinc-200 dark:border-zinc-700" : ""}>
                        {/* Category Header */}
                        <div
                            onClick={(e) => toggleCategory(opt.id, e)}
                            className={cn(
                                "px-3 py-1.5 flex items-center gap-2",
                                collapsibleCategories ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700" : "",
                                "font-medium bg-zinc-50 dark:bg-zinc-800",
                                depth > 0 && `pl-${3 + depth * 2}`,
                                categoryClassName
                            )}
                        >
                            {showIcons && opt.icon && <span className="flex-shrink-0">{React.cloneElement(opt.icon, { size: 16 })}</span>}
                            <span className="truncate flex-1">{opt.label}</span>
                            {collapsibleCategories && (
                                <ChevronDown
                                    size={14}
                                    className={cn("transition-transform", expandedCategories[opt.id] ? "transform rotate-180" : "")}
                                />
                            )}
                        </div>

                        {/* Category Items */}
                        {(!collapsibleCategories || expandedCategories[opt.id]) && <div>{renderOptions(opt.items, depth + 1)}</div>}
                    </div>
                );
            } else {
                // Flat option
                return (
                    <div
                        key={opt.id}
                        onClick={() => !opt.disabled && handleSelect(opt.id)}
                        className={cn(
                            "px-3 py-1.5 flex items-center gap-2 cursor-pointer",
                            opt.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-100 dark:hover:bg-zinc-700",
                            selectedIds.includes(opt.id) && "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200",
                            depth > 0 && `pl-${3 + depth * 3}`,
                            optionClassName
                        )}
                    >
                        {showIcons && opt.icon && <span className="flex-shrink-0">{React.cloneElement(opt.icon, { size: 16 })}</span>}
                        <span className="truncate flex-1">{opt.label}</span>
                    </div>
                );
            }
        });
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
                        "overflow-hidden flex flex-col",
                        menuClassName
                    )}
                    style={{
                        maxHeight,
                        minWidth,
                        zIndex,
                    }}
                >
                    {/* Search Input */}
                    {enableSearch && (
                        <div className="sticky top-0 px-2 pb-1 pt-2 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 z-10 flex-shrink-0">
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
                    <div className="overflow-y-auto flex-grow">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">No options found</div>
                        ) : (
                            renderOptions(filteredOptions)
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HierarchicalToggleMenu;
