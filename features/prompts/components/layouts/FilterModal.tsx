"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal, Check, Star } from "lucide-react";
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
import type { PromptSortOption, FavFilter, ArchFilter } from "../../hooks/usePromptFilters";
import { NONE_SENTINEL } from "../../hooks/usePromptFilters";

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;

    sortBy: PromptSortOption;
    onSortChange: (value: PromptSortOption) => void;

    excludedCats: string[];
    onExcludedCatsChange: (v: string[]) => void;

    excludedTags: string[];
    onExcludedTagsChange: (v: string[]) => void;

    favFilter: FavFilter;
    onFavFilterChange: (v: FavFilter) => void;

    archFilter: ArchFilter;
    onArchFilterChange: (v: ArchFilter) => void;

    favoritesFirst: boolean;
    onFavoritesFirstChange: (v: boolean) => void;

    allCategories: string[];
    allTags: string[];
}

/** A compact 3-option radio segment (All / Option A / Option B). */
function RadioSegment<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
}) {
    return (
        <div className="flex rounded-lg border border-border overflow-hidden">
            {options.map((opt, idx) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex-1 px-3 py-2 text-xs font-medium transition-all",
                        idx > 0 && "border-l border-border",
                        value === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

/** A single checkbox row. */
function CheckRow({
    checked,
    onToggle,
    label,
    italic,
}: {
    checked: boolean;
    onToggle: () => void;
    label: string;
    italic?: boolean;
}) {
    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-3 w-full py-2 text-left group"
        >
            <div className={cn(
                "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                checked ? "bg-primary border-primary" : "border-muted-foreground/40 group-hover:border-primary/50"
            )}>
                {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
            </div>
            <span className={cn(
                "text-sm",
                checked ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground",
                italic && !checked && "italic"
            )}>
                {label}
            </span>
        </button>
    );
}

export function FilterModal({
    isOpen,
    onClose,
    sortBy,
    onSortChange,
    excludedCats,
    onExcludedCatsChange,
    excludedTags,
    onExcludedTagsChange,
    favFilter,
    onFavFilterChange,
    archFilter,
    onArchFilterChange,
    favoritesFirst,
    onFavoritesFirstChange,
    allCategories,
    allTags,
}: FilterModalProps) {
    const isMobile = useIsMobile();

    // Local state — changes apply immediately on close (no "Apply" button for this panel)
    const [localSort, setLocalSort] = useState(sortBy);
    const [localXCats, setLocalXCats] = useState<string[]>(excludedCats);
    const [localXTags, setLocalXTags] = useState<string[]>(excludedTags);
    const [localFav, setLocalFav] = useState<FavFilter>(favFilter);
    const [localArch, setLocalArch] = useState<ArchFilter>(archFilter);
    const [localFavFirst, setLocalFavFirst] = useState(favoritesFirst);

    // Sync local state when props change (e.g., reset from outside)
    useEffect(() => {
        setLocalSort(sortBy);
        setLocalXCats(excludedCats);
        setLocalXTags(excludedTags);
        setLocalFav(favFilter);
        setLocalArch(archFilter);
        setLocalFavFirst(favoritesFirst);
    }, [sortBy, excludedCats, excludedTags, favFilter, archFilter, favoritesFirst]);

    const handleApply = () => {
        onSortChange(localSort);
        onExcludedCatsChange(localXCats);
        onExcludedTagsChange(localXTags);
        onFavFilterChange(localFav);
        onArchFilterChange(localArch);
        onFavoritesFirstChange(localFavFirst);
        onClose();
    };

    const handleClearAll = () => {
        setLocalSort("updated-desc");
        setLocalXCats([]);
        setLocalXTags([]);
        setLocalFav("all");
        setLocalArch("active");
        setLocalFavFirst(true);
    };

    // Exclusion model: toggling a cat/tag adds/removes it from the exclusion list
    const toggleCat = (cat: string) =>
        setLocalXCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

    const toggleTag = (tag: string) =>
        setLocalXTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

    const hasActiveFilters =
        localSort !== "updated-desc" ||
        localXCats.length > 0 ||
        localXTags.length > 0 ||
        localFav !== "all" ||
        localArch !== "active" ||
        !localFavFirst;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side={isMobile ? "left" : "right"}
                className={cn("w-[85%] sm:w-[400px] flex flex-col p-0", "h-dvh max-h-dvh")}
            >
                <SheetHeader className="px-6 py-4 border-b border-border/50">
                    <SheetTitle className="text-lg font-bold flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-primary" />
                        Filters & Sorting
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">
                        Changes apply when you tap Apply
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="space-y-6">

                        {/* Sort */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground block">Sort By</label>
                            <Select value={localSort} onValueChange={v => setLocalSort(v as PromptSortOption)}>
                                <SelectTrigger className="h-11 text-base" style={{ fontSize: "16px" }}>
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

                        {/* Favorites */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Star className="h-3.5 w-3.5 text-amber-400" />
                                Favorites
                            </label>
                            <RadioSegment<FavFilter>
                                value={localFav}
                                onChange={setLocalFav}
                                options={[
                                    { value: "all", label: "All" },
                                    { value: "yes", label: "Favorites" },
                                    { value: "no",  label: "Others" },
                                ]}
                            />
                            {/* Favorites First toggle */}
                            <button
                                onClick={() => setLocalFavFirst(!localFavFirst)}
                                className="flex items-center justify-between w-full pt-1"
                            >
                                <span className="text-sm text-muted-foreground">Pin favorites to top</span>
                                <div className={cn(
                                    "w-9 h-5 rounded-full relative transition-colors shrink-0",
                                    localFavFirst ? "bg-primary" : "bg-muted border border-border"
                                )}>
                                    <span className={cn(
                                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                                        localFavFirst ? "left-4" : "left-0.5"
                                    )} />
                                </div>
                            </button>
                        </div>

                        {/* Archived */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground block">Archived</label>
                            <RadioSegment<ArchFilter>
                                value={localArch}
                                onChange={setLocalArch}
                                options={[
                                    { value: "active",   label: "Active" },
                                    { value: "archived", label: "Archived" },
                                    { value: "both",     label: "All" },
                                ]}
                            />
                        </div>

                        {/* Category — exclusion model: checked = visible */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-foreground">Category</label>
                                {localXCats.length > 0 && (
                                    <button
                                        onClick={() => setLocalXCats([])}
                                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                    >
                                        Restore all
                                    </button>
                                )}
                            </div>
                            <div className="space-y-0.5">
                                <CheckRow
                                    checked={localXCats.length === 0}
                                    onToggle={() => setLocalXCats([])}
                                    label="All Categories"
                                />
                                <CheckRow
                                    checked={!localXCats.includes(NONE_SENTINEL)}
                                    onToggle={() => toggleCat(NONE_SENTINEL)}
                                    label="Uncategorized"
                                    italic
                                />
                                {allCategories.map(cat => (
                                    <CheckRow
                                        key={cat}
                                        checked={!localXCats.includes(cat)}
                                        onToggle={() => toggleCat(cat)}
                                        label={cat}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Tags — exclusion model: checked = visible */}
                        {(allTags.length > 0 || true) && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-foreground">Tags</label>
                                    {localXTags.length > 0 && (
                                        <button
                                            onClick={() => setLocalXTags([])}
                                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                        >
                                            Restore all
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                    <CheckRow
                                        checked={localXTags.length === 0}
                                        onToggle={() => setLocalXTags([])}
                                        label="All Tags"
                                    />
                                    <CheckRow
                                        checked={!localXTags.includes(NONE_SENTINEL)}
                                        onToggle={() => toggleTag(NONE_SENTINEL)}
                                        label="No tags"
                                        italic
                                    />
                                    {allTags.map(tag => (
                                        <CheckRow
                                            key={tag}
                                            checked={!localXTags.includes(tag)}
                                            onToggle={() => toggleTag(tag)}
                                            label={tag}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 bg-background border-t border-border/50 px-6 py-4 pb-safe space-y-2">
                    {hasActiveFilters && (
                        <Button variant="outline" onClick={handleClearAll} className="w-full h-11 text-base">
                            <X className="h-4 w-4 mr-2" />
                            Clear All
                        </Button>
                    )}
                    <Button onClick={handleApply} className="w-full h-11 text-base">
                        Apply Filters
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
