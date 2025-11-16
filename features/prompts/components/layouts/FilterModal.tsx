"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileOverlayWrapper } from "@/components/official/MobileOverlayWrapper";

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
        <MobileOverlayWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Filters & Sorting"
            description="Customize how your prompts are organized"
            maxHeight="md"
        >
            {/* Content */}
            <div className="p-6 space-y-6">
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

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-xl border-t border-border/50 p-4 space-y-2">
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
        </MobileOverlayWrapper>
    );
}

