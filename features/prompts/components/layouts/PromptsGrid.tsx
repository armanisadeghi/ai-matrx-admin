"use client";

import { useState, useTransition, useMemo } from "react";
import { PromptCard } from "./PromptCard";
import { FloatingActionBar } from "./FloatingActionBar";
import { DesktopSearchBar } from "./DesktopSearchBar";
import { NewPromptModal } from "./NewPromptModal";
import { FilterModal } from "./FilterModal";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-service";
import { useIsMobile } from "@/hooks/use-mobile";
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

    return (
        <>
            {/* Desktop Search Bar */}
            {!isMobile && (
                <DesktopSearchBar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    onFilterClick={() => setIsFilterModalOpen(true)}
                    onNewClick={() => setIsNewModalOpen(true)}
                    showFilterBadge={hasActiveFilters}
                />
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