"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

    if (!isOpen) return null;

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
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-background/80 backdrop-blur-md z-50"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="fixed inset-x-0 bottom-0 z-50 pb-safe">
                <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 max-w-[1800px] pb-4">
                    <div className="bg-background/95 backdrop-blur-xl rounded-t-3xl border border-b-0 border-border/50 shadow-2xl max-h-[85vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <SlidersHorizontal className="h-5 w-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-bold text-foreground">
                                        Filters & Sorting
                                    </h2>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="h-8 w-8"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Customize how your prompts are organized
                            </p>
                        </div>

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
                    </div>
                </div>
            </div>
        </>
    );
}

