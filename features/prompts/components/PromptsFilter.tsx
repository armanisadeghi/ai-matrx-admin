"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
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
        let filtered = prompts.filter(prompt => {
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
    useMemo(() => {
        onFilteredPromptsChange(filteredPrompts);
    }, [filteredPrompts, onFilteredPromptsChange]);

    const clearFilters = () => {
        setSearchTerm("");
        setSortBy("updated-desc");
    };

    const hasActiveFilters = searchTerm !== "" || sortBy !== "updated-desc";

    return (
        <div className="space-y-3 mb-6">
            {/* Main search and toggle */}
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search prompts by name or description..."
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
                    className={cn(showFilters && "bg-blue-500 hover:bg-blue-600")}
                >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                </Button>
            </div>

            {/* Expanded filters */}
            {showFilters && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                    <SelectItem value="updated-desc">Recently Updated</SelectItem>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="w-full text-xs"
                        >
                            <X className="h-3 w-3 mr-1" />
                            Clear All Filters
                        </Button>
                    )}
                </div>
            )}

            {/* Results count */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    Showing {filteredPrompts.length} of {prompts.length} prompts
                </span>
                {hasActiveFilters && (
                    <span className="text-blue-600 dark:text-blue-400">
                        Filters active
                    </span>
                )}
            </div>
        </div>
    );
}

