"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";

interface Prompt {
    id: string;
    name: string;
    description?: string;
}

interface PromptsFilterProps {
    prompts: Prompt[];
    onFilteredPromptsChange: (filtered: Prompt[]) => void;
}

export function PromptsFilter({ prompts, onFilteredPromptsChange }: PromptsFilterProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<string>("updated-desc");
    const [showFilters, setShowFilters] = useState(false);

    // Filter and sort prompts
    const filteredPrompts = useMemo(() => {
        let filtered = prompts.filter((prompt) => {
            // Search filter
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                searchTerm === "" ||
                prompt.name.toLowerCase().includes(searchLower) ||
                (prompt.description && prompt.description.toLowerCase().includes(searchLower));

            return matchesSearch;
        });

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "updated-desc":
                default:
                    // Default sort is by updated_at desc (already sorted from server)
                    return 0;
            }
        });

        return filtered;
    }, [prompts, searchTerm, sortBy]);

    // Update parent whenever filtered prompts change
    useEffect(() => {
        onFilteredPromptsChange(filteredPrompts);
    }, [filteredPrompts, onFilteredPromptsChange]);

    const clearFilters = () => {
        setSearchTerm("");
        setSortBy("updated-desc");
    };

    const hasActiveFilters = searchTerm !== "" || sortBy !== "updated-desc";

    return (
        <div className="space-y-3 mb-4 sm:mb-6">
            {/* Main search and toggle */}
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search prompts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-8 h-9 text-sm"
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
                    className="h-9 px-3"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Filters</span>
                </Button>
            </div>

            {/* Expanded filters */}
            {showFilters && (
                <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-3">
                    {/* Sort */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Sort By</label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="updated-desc">Recently Updated</SelectItem>
                                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs h-8">
                            <X className="h-3 w-3" />
                            Clear All Filters
                        </Button>
                    )}
                </div>
            )}

            {/* Results count */}
            {hasActiveFilters && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        Showing {filteredPrompts.length} of {prompts.length} prompts
                    </span>
                    <span className="text-primary">Filters active</span>
                </div>
            )}
        </div>
    );
}
