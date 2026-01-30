"use client";

import { useState, useTransition, useMemo } from "react";
import { PromptCard } from "./PromptCard";
import { SharedPromptCard } from "./SharedPromptCard";
import { MobileActionBar, MobileFilterDrawer } from "@/components/official/mobile-action-bar";
import { DesktopSearchBar } from "./DesktopSearchBar";
import { NewPromptModal } from "./NewPromptModal";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Plus, Users, ChevronDown, ChevronRight, LayoutPanelTop } from "lucide-react";
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import type { SharedPrompt } from "@/features/prompts/types/shared";

interface Prompt {
    id: string;
    name: string;
    description?: string;
}

interface PromptsGridProps {
    prompts: Prompt[];
    sharedPrompts?: SharedPrompt[];
}

export function PromptsGrid({ prompts, sharedPrompts = [] }: PromptsGridProps) {
    const router = useRouter();
    const isMobile = useIsMobile();
    const [isPending, startTransition] = useTransition();
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [promptToDelete, setPromptToDelete] = useState<{ id: string; name: string } | null>(null);
    
    // Shared prompts section state
    const [isSharedSectionOpen, setIsSharedSectionOpen] = useState(true);
    
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

    // Filter and sort shared prompts
    const filteredSharedPrompts = useMemo(() => {
        let filtered = sharedPrompts.filter((prompt) => {
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            return (
                prompt.name.toLowerCase().includes(searchLower) ||
                (prompt.description && prompt.description.toLowerCase().includes(searchLower)) ||
                (prompt.ownerEmail && prompt.ownerEmail.toLowerCase().includes(searchLower))
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
    }, [sharedPrompts, searchTerm, sortBy]);

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

    // Handler for duplicating shared prompts (copy to my prompts)
    const handleDuplicateShared = async (id: string) => {
        setDuplicatingIds(prev => new Set(prev).add(id));
        
        try {
            const response = await fetch(`/api/prompts/${id}/duplicate`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to copy prompt");
            }

            router.refresh();
            toast.success("Prompt copied to your prompts!");
        } catch (error) {
            console.error("Error copying shared prompt:", error);
            toast.error("Failed to copy prompt. Please try again.");
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

    // Filter configuration for MobileFilterDrawer
    const filterConfig = {
        fields: [
            {
                id: "sortBy",
                label: "Sort By",
                type: "select" as const,
                options: [
                    { value: "updated-desc", label: "Recently Updated" },
                    { value: "name-asc", label: "Name (A-Z)" },
                    { value: "name-desc", label: "Name (Z-A)" },
                ],
            },
        ],
        entityLabel: "prompts",
        entityLabelSingular: "prompt",
    };

    // Active filters state for drawer
    const activeFilters = { sortBy };

    const handleFiltersChange = (filters: Record<string, string | string[] | boolean>) => {
        if (filters.sortBy && typeof filters.sortBy === "string") {
            setSortBy(filters.sortBy);
        }
    };

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

            {/* My Prompts Section Header */}
            {prompts.length > 0 && sharedPrompts.length > 0 && (
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    My Prompts
                    <Badge variant="secondary" className="font-normal">
                        {filteredPrompts.length}
                    </Badge>
                </h2>
            )}

            {/* Personal Prompts Area */}
            {prompts.length === 0 ? (
                // Empty State Component
                <div className={cn(
                    "mb-8",
                    sharedPrompts.length === 0 && isMobile && "pb-24"
                )}>
                    <div className="border border-primary/20 rounded-xl p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <Plus className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Create Your First Prompt</h3>
                                <p className="text-muted-foreground">
                                    Start from scratch or use a template to build your prompt library
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    onClick={() => setIsNewModalOpen(true)}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Blank Prompt
                                </button>
                                <button
                                    onClick={() => router.push('/ai/prompts/templates')}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
                                >
                                    <LayoutPanelTop className="h-4 w-4 mr-2" />
                                    Browse Templates
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : filteredPrompts.length === 0 ? (
                // No matches state
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        No prompts match your filters. Try adjusting your search or filters.
                    </p>
                </div>
            ) : (
                // Prompts Grid
                <div className={cn(
                    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
                    sharedPrompts.length === 0 && isMobile && "pb-24"
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

            {/* Shared with Me Section */}
            {sharedPrompts.length > 0 && (
                <Collapsible
                    open={isSharedSectionOpen}
                    onOpenChange={setIsSharedSectionOpen}
                    className={cn("mt-8", isMobile && "pb-24")}
                >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full group mb-4 hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2">
                            {isSharedSectionOpen ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                            <Users className="w-5 h-5 text-secondary" />
                            <h2 className="text-lg font-semibold text-foreground">
                                Shared with Me
                            </h2>
                            <Badge variant="secondary" className="font-normal">
                                {filteredSharedPrompts.length}
                            </Badge>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        {filteredSharedPrompts.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-border rounded-lg bg-muted/30">
                                <p className="text-muted-foreground">
                                    No shared prompts match your search.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredSharedPrompts.map((prompt) => (
                                    <SharedPromptCard
                                        key={prompt.id}
                                        id={prompt.id}
                                        name={prompt.name}
                                        description={prompt.description}
                                        permissionLevel={prompt.permissionLevel}
                                        ownerEmail={prompt.ownerEmail}
                                        onDuplicate={handleDuplicateShared}
                                        onNavigate={handleNavigate}
                                        isDuplicating={duplicatingIds.has(prompt.id)}
                                        isNavigating={navigatingId === prompt.id}
                                        isAnyNavigating={navigatingId !== null}
                                    />
                                ))}
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* Mobile Action Bar */}
            <MobileActionBar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                totalCount={prompts.length}
                filteredCount={filteredPrompts.length}
                onPrimaryAction={() => setIsNewModalOpen(true)}
                primaryActionLabel="New Prompt"
                primaryActionIcon={<Plus className="h-5 w-5" />}
                showFilterButton={true}
                showVoiceSearch={true}
                isFilterModalOpen={isFilterModalOpen}
                setIsFilterModalOpen={setIsFilterModalOpen}
                searchPlaceholder="Search prompts..."
            />

            {/* Modals */}
            <NewPromptModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
            />
            <MobileFilterDrawer
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                filterConfig={filterConfig}
                activeFilters={activeFilters}
                onFiltersChange={handleFiltersChange}
                totalCount={prompts.length}
                filteredCount={filteredPrompts.length}
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