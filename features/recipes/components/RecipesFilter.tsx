"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Recipe {
    id: string;
    name: string;
    description?: string;
    tags?: any;
    status?: string;
}

interface RecipesFilterProps {
    recipes: Recipe[];
    onFilteredRecipesChange: (filtered: Recipe[]) => void;
}

export function RecipesFilter({ recipes, onFilteredRecipesChange }: RecipesFilterProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<string>("name-asc");
    const [showFilters, setShowFilters] = useState(false);

    // Extract all unique tags and statuses
    const { allTags, allStatuses } = useMemo(() => {
        const tagsSet = new Set<string>();
        const statusesSet = new Set<string>();

        recipes.forEach(recipe => {
            if (recipe.status) statusesSet.add(recipe.status);
            if (recipe.tags) {
                // Tags might be stored as JSON object or array
                try {
                    const tags = typeof recipe.tags === 'string' 
                        ? JSON.parse(recipe.tags) 
                        : recipe.tags;
                    
                    if (Array.isArray(tags)) {
                        tags.forEach(tag => tagsSet.add(tag));
                    } else if (tags && typeof tags === 'object' && tags.tags && Array.isArray(tags.tags)) {
                        tags.tags.forEach((tag: string) => tagsSet.add(tag));
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
        });

        return {
            allTags: Array.from(tagsSet).sort(),
            allStatuses: Array.from(statusesSet).sort()
        };
    }, [recipes]);

    // Filter and sort recipes
    const filteredRecipes = useMemo(() => {
        let filtered = recipes.filter(recipe => {
            // Search filter
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                searchTerm === "" ||
                recipe.name.toLowerCase().includes(searchLower) ||
                (recipe.description && recipe.description.toLowerCase().includes(searchLower));

            if (!matchesSearch) return false;

            // Status filter
            if (selectedStatus !== "all" && recipe.status !== selectedStatus) {
                return false;
            }

            // Tags filter
            if (selectedTags.length > 0) {
                try {
                    const tags = typeof recipe.tags === 'string' 
                        ? JSON.parse(recipe.tags) 
                        : recipe.tags;
                    
                    const recipeTags = Array.isArray(tags) 
                        ? tags 
                        : (tags?.tags || []);

                    const hasAllTags = selectedTags.every(tag => recipeTags.includes(tag));
                    if (!hasAllTags) return false;
                } catch (e) {
                    return false;
                }
            }

            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "status":
                    return (a.status || "").localeCompare(b.status || "");
                default:
                    return 0;
            }
        });

        return filtered;
    }, [recipes, searchTerm, selectedStatus, selectedTags, sortBy]);

    // Update parent whenever filtered recipes change
    useMemo(() => {
        onFilteredRecipesChange(filteredRecipes);
    }, [filteredRecipes, onFilteredRecipesChange]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedStatus("all");
        setSelectedTags([]);
        setSortBy("name-asc");
    };

    const hasActiveFilters = searchTerm !== "" || selectedStatus !== "all" || selectedTags.length > 0 || sortBy !== "name-asc";

    return (
        <div className="space-y-3 mb-6">
            {/* Main search and toggle */}
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search recipes by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-8"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(showFilters && "bg-purple-500 hover:bg-purple-600")}
                >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                </Button>
            </div>

            {/* Expanded filters */}
            {showFilters && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Status filter */}
                        {allStatuses.length > 0 && (
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                                    Status
                                </label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {allStatuses.map(status => (
                                            <SelectItem key={status} value={status}>
                                                {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Sort */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                                Sort By
                            </label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                    {allStatuses.length > 0 && (
                                        <SelectItem value="status">Status</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Tags filter */}
                    {allTags.length > 0 && (
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                                Tags
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {allTags.map(tag => (
                                    <Badge
                                        key={tag}
                                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                                        className={cn(
                                            "cursor-pointer text-xs",
                                            selectedTags.includes(tag) && "bg-purple-500 hover:bg-purple-600"
                                        )}
                                        onClick={() => toggleTag(tag)}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="w-full text-xs"
                        >
                            <X className="h-3 w-3" />
                            Clear All Filters
                        </Button>
                    )}
                </div>
            )}

            {/* Results count */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    Showing {filteredRecipes.length} of {recipes.length} recipes
                </span>
                {hasActiveFilters && (
                    <span className="text-purple-600 dark:text-purple-400">
                        Filters active
                    </span>
                )}
            </div>
        </div>
    );
}

