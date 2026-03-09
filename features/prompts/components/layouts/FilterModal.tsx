"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { PromptSortOption } from "../../hooks/usePromptFilters";

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    sortBy: string;
    onSortChange: (value: string) => void;
    category: string;
    onCategoryChange: (value: string) => void;
    tags: string[];
    onTagsChange: (value: string[]) => void;
    showArchived: boolean;
    onShowArchivedChange: (value: boolean) => void;
    favoritesOnly: boolean;
    onFavoritesOnlyChange: (value: boolean) => void;
    allCategories: string[];
    allTags: string[];
}

export function FilterModal({
    isOpen,
    onClose,
    sortBy,
    onSortChange,
    category,
    onCategoryChange,
    tags,
    onTagsChange,
    showArchived,
    onShowArchivedChange,
    favoritesOnly,
    onFavoritesOnlyChange,
    allCategories,
    allTags,
}: FilterModalProps) {
    const isMobile = useIsMobile();
    const [localSortBy, setLocalSortBy] = useState(sortBy);
    const [localCategory, setLocalCategory] = useState(category);
    const [localTags, setLocalTags] = useState<string[]>(tags);
    const [localShowArchived, setLocalShowArchived] = useState(showArchived);
    const [localFavoritesOnly, setLocalFavoritesOnly] = useState(favoritesOnly);

    useEffect(() => {
        setLocalSortBy(sortBy);
        setLocalCategory(category);
        setLocalTags(tags);
        setLocalShowArchived(showArchived);
        setLocalFavoritesOnly(favoritesOnly);
    }, [sortBy, category, tags, showArchived, favoritesOnly]);

    const handleApply = () => {
        onSortChange(localSortBy);
        onCategoryChange(localCategory);
        onTagsChange(localTags);
        onShowArchivedChange(localShowArchived);
        onFavoritesOnlyChange(localFavoritesOnly);
        onClose();
    };

    const handleClearAll = () => {
        setLocalSortBy("updated-desc");
        setLocalCategory("");
        setLocalTags([]);
        setLocalShowArchived(false);
        setLocalFavoritesOnly(false);
    };

    const toggleTag = (tag: string) => {
        setLocalTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const hasActiveFilters =
        localSortBy !== "updated-desc" ||
        localCategory !== "" ||
        localTags.length > 0 ||
        localShowArchived ||
        localFavoritesOnly;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side={isMobile ? "left" : "right"}
                className={cn(
                    "w-[85%] sm:w-[400px] flex flex-col p-0",
                    "h-dvh max-h-dvh"
                )}
            >
                <SheetHeader className="px-6 py-4 border-b border-border/50">
                    <SheetTitle className="text-lg font-bold flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-primary" />
                        Filters & Sorting
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">
                        Customize how your prompts are organized
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-6">
                        {/* Sort Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-foreground block">
                                Sort By
                            </label>
                            <Select value={localSortBy} onValueChange={setLocalSortBy}>
                                <SelectTrigger className="h-12 text-base" style={{ fontSize: "16px" }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="updated-desc">Recently Updated</SelectItem>
                                    <SelectItem value="created-desc">Recently Created</SelectItem>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                    <SelectItem value="category-asc">Category (A-Z)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-foreground block">
                                Category
                            </label>
                            <Select value={localCategory || "__all__"} onValueChange={(v) => setLocalCategory(v === "__all__" ? "" : v)}>
                                <SelectTrigger className="h-12 text-base" style={{ fontSize: "16px" }}>
                                    <SelectValue placeholder="All categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All Categories</SelectItem>
                                    {allCategories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tags Section */}
                        {allTags.length > 0 && (
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-foreground block">
                                    Tags {localTags.length > 0 && `(${localTags.length})`}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {allTags.map((tag) => {
                                        const isActive = localTags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                className={cn(
                                                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95",
                                                    isActive
                                                        ? "bg-primary text-primary-foreground"
                                                        : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                                )}
                                            >
                                                {tag}
                                                {isActive && <Check className="h-3 w-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Toggle Filters */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Favorites Only</Label>
                                <Switch checked={localFavoritesOnly} onCheckedChange={setLocalFavoritesOnly} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Show Archived</Label>
                                <Switch checked={localShowArchived} onCheckedChange={setLocalShowArchived} />
                            </div>
                        </div>
                    </div>
                </div>

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

