"use client";

import { useState, useTransition, useMemo } from "react";
import { PromptCard } from "./PromptCard";
import { FloatingActionBar } from "../actions/FloatingActionBar";
import { NewPromptModal } from "../actions/NewPromptModal";
import { FilterModal } from "../actions/FilterModal";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Prompt {
    id: string;
    name: string;
    description?: string;
}

interface PromptsGridProps {
    prompts: Prompt[];
}

export function PromptsGrid({ prompts }: PromptsGridProps) {
    const router = useRouter();
    const isMobile = useIsMobile();
    const [isPending, startTransition] = useTransition();
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [promptToDelete, setPromptToDelete] = useState<{ id: string; name: string } | null>(null);
    
    // Search and filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("updated-desc");
    const [showFilters, setShowFilters] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    // Filter and sort prompts
    const filteredPrompts = useMemo(() => {
        let filtered = prompts.filter((prompt) => {
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            return (
                prompt.name.toLowerCase().includes(searchLower) ||
                (prompt.description && prompt.description.toLowerCase().includes(searchLower))
            );
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
                    return 0;
            }
        });

        return filtered;
    }, [prompts, searchTerm, sortBy]);

    const handleDeleteClick = (id: string, name: string) => {
        setPromptToDelete({ id, name });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!promptToDelete) return;
        
        const { id } = promptToDelete;
        setDeletingIds(prev => new Set(prev).add(id));
        
        try {
            const response = await fetch(`/api/prompts/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete prompt");
            }

            router.refresh();
            toast.success("Prompt deleted successfully!");
        } catch (error) {
            console.error("Error deleting prompt:", error);
            toast.error("Failed to delete prompt. Please try again.");
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        } finally {
            setDeleteDialogOpen(false);
            setPromptToDelete(null);
        }
    };

    const handleDuplicate = async (id: string) => {
        setDuplicatingIds(prev => new Set(prev).add(id));
        
        try {
            const response = await fetch(`/api/prompts/${id}/duplicate`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to duplicate prompt");
            }

            router.refresh();
            toast.success("Prompt duplicated successfully!");
        } catch (error) {
            console.error("Error duplicating prompt:", error);
            toast.error("Failed to duplicate prompt. Please try again.");
        } finally {
            setDuplicatingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setPromptToDelete(null);
    };

    const handleNavigate = (id: string, path: string) => {
        // Prevent navigation if already navigating
        if (navigatingId) return;
        
        setNavigatingId(id);
        startTransition(() => {
            router.push(path);
        });
    };

    const hasActiveFilters = searchTerm !== "" || sortBy !== "updated-desc";

    if (prompts.length === 0) {
        return (
            <>
                <div className="text-center py-12 pb-24">
                    <p className="text-muted-foreground">No prompts found. Create your first prompt to get started!</p>
                </div>
                
                {/* Floating Action Bar */}
                <FloatingActionBar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    onFilterClick={() => setIsFilterModalOpen(true)}
                    onNewClick={() => setIsNewModalOpen(true)}
                    showFilterBadge={hasActiveFilters}
                />

                {/* Modals */}
                <NewPromptModal
                    isOpen={isNewModalOpen}
                    onClose={() => setIsNewModalOpen(false)}
                />
                <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                />
            </>
        );
    }

    const clearFilters = () => {
        setSearchTerm("");
        setSortBy("updated-desc");
    };

    return (
        <>
            {/* Desktop Search and Filter */}
            {!isMobile && (
                <div className="space-y-3 mb-6">
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
                            <span className="hidden sm:inline ml-2">Filters</span>
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                                    Sort By
                                </label>
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

                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="w-full text-xs h-8"
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Clear All Filters
                                </Button>
                            )}
                        </div>
                    )}

                    {hasActiveFilters && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                Showing {filteredPrompts.length} of {prompts.length} prompts
                            </span>
                            <span className="text-primary">Filters active</span>
                        </div>
                    )}
                </div>
            )}

            {/* Prompts Grid */}
            {filteredPrompts.length === 0 ? (
                <div className="text-center py-12 pb-24">
                    <p className="text-muted-foreground">
                        No prompts match your filters. Try adjusting your search or filters.
                    </p>
                </div>
            ) : (
                <div className={cn(
                    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
                    isMobile && "pb-24"
                )}>
                    {filteredPrompts.map((prompt) => (
                        <PromptCard
                            key={prompt.id}
                            id={prompt.id}
                            name={prompt.name}
                            description={prompt.description}
                            onDelete={(id) => {
                                const prompt = prompts.find(p => p.id === id);
                                if (prompt) {
                                    handleDeleteClick(id, prompt.name);
                                }
                            }}
                            onDuplicate={handleDuplicate}
                            onNavigate={handleNavigate}
                            isDeleting={deletingIds.has(prompt.id)}
                            isDuplicating={duplicatingIds.has(prompt.id)}
                            isNavigating={navigatingId === prompt.id}
                            isAnyNavigating={navigatingId !== null}
                        />
                    ))}
                </div>
            )}

            {/* Mobile Floating Action Bar */}
            <FloatingActionBar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                onFilterClick={() => setIsFilterModalOpen(true)}
                onNewClick={() => setIsNewModalOpen(true)}
                showFilterBadge={hasActiveFilters}
            />

            {/* Modals */}
            <NewPromptModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
            />
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                sortBy={sortBy}
                onSortChange={setSortBy}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                            Delete Prompt
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{promptToDelete?.name}"? 
                            This action cannot be undone and will permanently remove the prompt from your account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDelete}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete Prompt
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}