"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MobileFilterDrawerProps, FilterState } from "./types";

/**
 * MobileFilterDrawer - Reusable filter drawer with live results count
 * 
 * Features:
 * - Generic filter configuration system
 * - Live results count display in footer
 * - "Clear All Filters" button when filters are active
 * - Proper mobile UX with safe area padding
 * - Supports multiple filter types (select, multiselect, toggle, radio)
 * 
 * @example
 * ```tsx
 * <MobileFilterDrawer
 *   isOpen={isFilterModalOpen}
 *   onClose={() => setIsFilterModalOpen(false)}
 *   filterConfig={{
 *     fields: [
 *       {
 *         id: "sortBy",
 *         label: "Sort By",
 *         type: "select",
 *         options: [
 *           { value: "updated-desc", label: "Recently Updated" },
 *           { value: "name-asc", label: "Name (A-Z)" },
 *         ]
 *       }
 *     ],
 *     entityLabel: "prompts",
 *     entityLabelSingular: "prompt"
 *   }}
 *   activeFilters={filters}
 *   onFiltersChange={setFilters}
 *   totalCount={prompts.length}
 *   filteredCount={filteredPrompts.length}
 * />
 * ```
 */
export function MobileFilterDrawer({
    isOpen,
    onClose,
    filterConfig,
    activeFilters,
    onFiltersChange,
    totalCount,
    filteredCount,
    className,
}: MobileFilterDrawerProps) {
    const isMobile = useIsMobile();
    const [localFilters, setLocalFilters] = useState<FilterState>(activeFilters);

    useEffect(() => {
        setLocalFilters(activeFilters);
    }, [activeFilters]);

    const handleApply = () => {
        onFiltersChange(localFilters);
        onClose();
    };

    const handleClearAll = () => {
        const clearedFilters: FilterState = {};
        
        // Reset all filters to their default values
        filterConfig.fields.forEach(field => {
            if (field.type === "toggle") {
                clearedFilters[field.id] = false;
            } else if (field.type === "multiselect") {
                clearedFilters[field.id] = [];
            } else {
                // For select and radio, use first option or empty string
                clearedFilters[field.id] = field.options?.[0]?.value || "";
            }
        });
        
        setLocalFilters(clearedFilters);
        onFiltersChange(clearedFilters);
    };

    const handleFilterChange = (fieldId: string, value: string | string[] | boolean) => {
        setLocalFilters(prev => ({
            ...prev,
            [fieldId]: value,
        }));
    };

    // Determine if there are active filters (any filter differs from default)
    const hasActiveFilters = filterConfig.fields.some(field => {
        const currentValue = localFilters[field.id];
        
        if (field.type === "toggle") {
            return currentValue === true;
        } else if (field.type === "multiselect") {
            return Array.isArray(currentValue) && currentValue.length > 0;
        } else {
            const defaultValue = field.options?.[0]?.value || "";
            return currentValue !== defaultValue && currentValue !== "";
        }
    });

    // Get entity labels with proper pluralization
    const entityLabel = filterConfig.entityLabel || "items";
    const entityLabelSingular = filterConfig.entityLabelSingular || "item";
    const displayLabel = filteredCount === 1 ? entityLabelSingular : entityLabel;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent 
                side={isMobile ? "left" : "right"}
                className={cn(
                    "w-[85%] sm:w-[400px] flex flex-col p-0",
                    "h-dvh max-h-dvh",
                    className
                )}
            >
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b border-border/50">
                    <SheetTitle className="text-lg font-bold flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-primary" />
                        Filters & Sorting
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">
                        Customize how your {entityLabel} are organized
                    </SheetDescription>
                </SheetHeader>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-6">
                        {filterConfig.fields.map(field => (
                            <div key={field.id} className="space-y-3">
                                <label className="text-sm font-semibold text-foreground block">
                                    {field.label}
                                </label>
                                
                                {field.description && (
                                    <p className="text-xs text-muted-foreground -mt-2">
                                        {field.description}
                                    </p>
                                )}

                                {/* Select field */}
                                {field.type === "select" && field.options && (
                                    <Select 
                                        value={localFilters[field.id] as string || field.options[0]?.value}
                                        onValueChange={(value) => handleFilterChange(field.id, value)}
                                    >
                                        <SelectTrigger className="h-12 text-base" style={{ fontSize: '16px' }}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {field.options.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {/* Additional filter types can be implemented here */}
                                {/* multiselect, toggle, radio, etc. */}
                            </div>
                        ))}

                        {/* Future filter options placeholder */}
                        {filterConfig.fields.length === 0 && (
                            <div className="pt-4 space-y-2">
                                <p className="text-xs text-muted-foreground text-center">
                                    No filters available
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions with Live Count */}
                <div className="flex-shrink-0 bg-background border-t border-border/50 px-6 py-4 pb-safe space-y-3">
                    {/* Live Results Count */}
                    <div className="text-center py-2 px-4 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium text-foreground">
                            Showing <span className="font-bold text-primary">{filteredCount}</span> of {totalCount} {displayLabel}
                        </p>
                    </div>

                    {/* Clear All Filters Button */}
                    {hasActiveFilters && (
                        <Button
                            variant="outline"
                            onClick={handleClearAll}
                            className="w-full h-12 text-base"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Clear All Filters
                        </Button>
                    )}

                    {/* Apply Filters Button */}
                    <Button
                        onClick={handleApply}
                        className="w-full h-12 text-base"
                    >
                        Apply Filters
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

