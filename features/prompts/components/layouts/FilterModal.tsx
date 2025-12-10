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

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    sortBy: string;
    onSortChange: (value: string) => void;
}

export function FilterModal({
    isOpen,
    onClose,
    sortBy,
    onSortChange,
}: FilterModalProps) {
    const isMobile = useIsMobile();
    const [localSortBy, setLocalSortBy] = useState(sortBy);

    useEffect(() => {
        setLocalSortBy(sortBy);
    }, [sortBy]);

    const handleApply = () => {
        onSortChange(localSortBy);
        onClose();
    };

    const handleClearAll = () => {
        setLocalSortBy("updated-desc");
        onSortChange("updated-desc");
    };

    const hasActiveFilters = localSortBy !== "updated-desc";

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent 
                side={isMobile ? "left" : "right"}
                className={cn(
                    "w-[85%] sm:w-[400px] flex flex-col p-0",
                    "h-dvh max-h-dvh"
                )}
            >
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b border-border/50">
                    <SheetTitle className="text-lg font-bold flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-primary" />
                        Filters & Sorting
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">
                        Customize how your prompts are organized
                    </SheetDescription>
                </SheetHeader>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-6">
                        {/* Sort Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-foreground block">
                                Sort By
                            </label>
                            <Select value={localSortBy} onValueChange={setLocalSortBy}>
                                <SelectTrigger className="h-12 text-base" style={{ fontSize: '16px' }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="updated-desc">Recently Updated</SelectItem>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Future filter options can be added here */}
                        <div className="pt-4 space-y-2">
                            <p className="text-xs text-muted-foreground text-center">
                                More filter options coming soon
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex-shrink-0 bg-background border-t border-border/50 px-6 py-4 pb-safe space-y-2">
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

