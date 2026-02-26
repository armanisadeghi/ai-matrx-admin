"use client";

import { useState, useTransition, useMemo } from "react";
import { PromptCard } from "./PromptCard";
import { SharedPromptCard } from "./SharedPromptCard";
import { PromptListItem } from "./PromptListItem";
import { SharedPromptListItem } from "./SharedPromptListItem";
import { MobileActionBar } from "@/components/official/mobile-action-bar";
import { BottomSheet, BottomSheetHeader, BottomSheetBody } from "@/components/official/bottom-sheet";
import { Check, ChevronRight, RotateCcw } from "lucide-react";
import { DesktopSearchBar } from "./DesktopSearchBar";
import { NewPromptModal } from "./NewPromptModal";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Plus, Users, LayoutPanelTop } from "lucide-react";
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
import { Button } from "@/components/ui/button";
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

// Threshold constants for hybrid card/list layout
const CARDS_DISPLAY_LIMIT_DESKTOP = 8;
const CARDS_DISPLAY_LIMIT_MOBILE = 4;

export function PromptsGrid({ prompts, sharedPrompts = [] }: PromptsGridProps) {
    const router = useRouter();
    const isMobile = useIsMobile();
    const cardsLimit = isMobile ? CARDS_DISPLAY_LIMIT_MOBILE : CARDS_DISPLAY_LIMIT_DESKTOP;
    const [isPending, startTransition] = useTransition();
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [promptToDelete, setPromptToDelete] = useState<{ id: string; name: string } | null>(null);
    
    // Tab state
    type PromptTab = "mine" | "shared";
    const [activeTab, setActiveTab] = useState<PromptTab>("mine");
    const hasShared = sharedPrompts.length > 0;
    
    // Pagination state for list items
    const [promptListPage, setPromptListPage] = useState(1);
    const [sharedListPage, setSharedListPage] = useState(1);
    const LIST_ITEMS_PER_PAGE = 20;
    
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

    // Split prompts into cards and list items based on threshold
    const promptCards = useMemo(() => filteredPrompts.slice(0, cardsLimit), [filteredPrompts, cardsLimit]);
    const allPromptListItems = useMemo(() => filteredPrompts.slice(cardsLimit), [filteredPrompts, cardsLimit]);
    const promptListItems = useMemo(() => allPromptListItems.slice(0, promptListPage * LIST_ITEMS_PER_PAGE), [allPromptListItems, promptListPage]);
    const hasMorePrompts = allPromptListItems.length > promptListItems.length;

    // Split shared prompts into cards and list items based on threshold
    const sharedPromptCards = useMemo(() => filteredSharedPrompts.slice(0, cardsLimit), [filteredSharedPrompts, cardsLimit]);
    const allSharedListItems = useMemo(() => filteredSharedPrompts.slice(cardsLimit), [filteredSharedPrompts, cardsLimit]);
    const sharedPromptListItems = useMemo(() => allSharedListItems.slice(0, sharedListPage * LIST_ITEMS_PER_PAGE), [allSharedListItems, sharedListPage]);
    const hasMoreShared = allSharedListItems.length > sharedPromptListItems.length;
    
    // Reset pagination when search/filter changes
    useMemo(() => {
        setPromptListPage(1);
        setSharedListPage(1);
    }, [searchTerm, sortBy]);

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

    const sortOptions = [
        { value: "updated-desc", label: "Recently Updated" },
        { value: "name-asc", label: "Name (A-Z)" },
        { value: "name-desc", label: "Name (Z-A)" },
    ];
    const showOptions: { value: PromptTab | "all"; label: string }[] = [
        { value: "all", label: "All Prompts" },
        { value: "mine", label: "My Prompts" },
        { value: "shared", label: "Shared with Me" },
    ];
    const [filterDetailKey, setFilterDetailKey] = useState<string | null>(null);
    const hasSortFilter = sortBy !== "updated-desc";
    const hasShowFilter = activeTab !== "mine";
    const activeFilterCount = (hasSortFilter ? 1 : 0) + (hasShowFilter ? 1 : 0);

    const handleFilterModalChange = (open: boolean) => {
        setIsFilterModalOpen(open);
        if (!open) setFilterDetailKey(null);
    };

    const isSearching = searchTerm.length > 0;

    // When searching, determine cross-tab matches for the "Also found in" section
    const otherTabLabel = activeTab === "mine" ? "Shared" : "Mine";
    const otherTabFiltered = activeTab === "mine" ? filteredSharedPrompts : filteredPrompts;

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

            {/* Pill Tabs */}
            {hasShared && (
                <div className="flex items-center gap-1 mb-3">
                    <button
                        onClick={() => setActiveTab("mine")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                            activeTab === "mine"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                        Mine
                        <span className="text-[10px] opacity-70">{filteredPrompts.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("shared")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                            activeTab === "shared"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                        Shared
                        <span className="text-[10px] opacity-70">{filteredSharedPrompts.length}</span>
                    </button>
                </div>
            )}

            {/* Active Tab Content */}
            <div className={cn(isMobile && "pb-24")}>
            {activeTab === "mine" ? (
                <>
                    {prompts.length === 0 ? (
                        <div className="mb-8">
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
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">
                                No prompts match your search.
                            </p>
                        </div>
                    ) : (
                        <>
                            {promptCards.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {promptCards.map((prompt) => (
                                        <PromptCard
                                            key={prompt.id}
                                            id={prompt.id}
                                            name={prompt.name}
                                            description={prompt.description}
                                            onDelete={(id) => {
                                                const p = prompts.find(x => x.id === id);
                                                if (p) handleDeleteClick(id, p.name);
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
                            {promptListItems.length > 0 && (
                                <>
                                    <div className="mt-6 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                        {promptListItems.map((prompt) => (
                                            <PromptListItem
                                                key={prompt.id}
                                                id={prompt.id}
                                                name={prompt.name}
                                                description={prompt.description}
                                                onDelete={(id) => {
                                                    const p = prompts.find(x => x.id === id);
                                                    if (p) handleDeleteClick(id, p.name);
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
                                    {hasMorePrompts && (
                                        <div className="mt-4 flex justify-center">
                                            <Button
                                                variant="outline"
                                                onClick={() => setPromptListPage(prev => prev + 1)}
                                                className="w-full md:w-auto"
                                            >
                                                Show More ({allPromptListItems.length - promptListItems.length} remaining)
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            ) : (
                /* Shared Tab */
                <>
                    {filteredSharedPrompts.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">
                                {searchTerm ? "No shared prompts match your search." : "No prompts have been shared with you yet."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {sharedPromptCards.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {sharedPromptCards.map((prompt) => (
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
                            {sharedPromptListItems.length > 0 && (
                                <>
                                    <div className="mt-6 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                        {sharedPromptListItems.map((prompt) => (
                                            <SharedPromptListItem
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
                                    {hasMoreShared && (
                                        <div className="mt-4 flex justify-center">
                                            <Button
                                                variant="outline"
                                                onClick={() => setSharedListPage(prev => prev + 1)}
                                                className="w-full md:w-auto"
                                            >
                                                Show More ({allSharedListItems.length - sharedPromptListItems.length} remaining)
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}

            {/* "Also found in" cross-tab results during search */}
            {isSearching && hasShared && otherTabFiltered.length > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            Also found in {otherTabLabel} ({otherTabFiltered.length})
                        </span>
                    </div>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {activeTab === "mine" ? (
                            otherTabFiltered.map((prompt) => (
                                <SharedPromptListItem
                                    key={prompt.id}
                                    id={prompt.id}
                                    name={prompt.name}
                                    description={prompt.description}
                                    permissionLevel={(prompt as SharedPrompt).permissionLevel}
                                    ownerEmail={(prompt as SharedPrompt).ownerEmail}
                                    onDuplicate={handleDuplicateShared}
                                    onNavigate={handleNavigate}
                                    isDuplicating={duplicatingIds.has(prompt.id)}
                                    isNavigating={navigatingId === prompt.id}
                                    isAnyNavigating={navigatingId !== null}
                                />
                            ))
                        ) : (
                            otherTabFiltered.map((prompt) => (
                                <PromptListItem
                                    key={prompt.id}
                                    id={prompt.id}
                                    name={prompt.name}
                                    description={prompt.description}
                                    onDelete={(id) => {
                                        const p = prompts.find(x => x.id === id);
                                        if (p) handleDeleteClick(id, p.name);
                                    }}
                                    onDuplicate={handleDuplicate}
                                    onNavigate={handleNavigate}
                                    isDeleting={deletingIds.has(prompt.id)}
                                    isDuplicating={duplicatingIds.has(prompt.id)}
                                    isNavigating={navigatingId === prompt.id}
                                    isAnyNavigating={navigatingId !== null}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
            </div>

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
            <BottomSheet open={isFilterModalOpen} onOpenChange={handleFilterModalChange} title="Filters">
                <BottomSheetHeader
                    title={
                        filterDetailKey === "sortBy" ? "Sort By"
                            : filterDetailKey === "show" ? "Show"
                                : "Filters"
                    }
                    showBack={filterDetailKey !== null}
                    onBack={() => setFilterDetailKey(null)}
                    trailing={
                        !filterDetailKey && activeFilterCount > 0 ? (
                            <button
                                onClick={() => {
                                    setSortBy("updated-desc");
                                    setActiveTab("mine");
                                }}
                                className="flex items-center gap-1 text-primary active:opacity-70 min-h-[44px] px-1"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span className="text-[15px]">Reset</span>
                            </button>
                        ) : !filterDetailKey ? (
                            <button
                                onClick={() => handleFilterModalChange(false)}
                                className="text-primary active:opacity-70 min-h-[44px] px-1 text-[15px]"
                            >
                                Done
                            </button>
                        ) : null
                    }
                />
                <BottomSheetBody>
                    {filterDetailKey === "sortBy" ? (
                        <>
                            {sortOptions.map((option, idx) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setSortBy(option.value);
                                        setFilterDetailKey(null);
                                    }}
                                    className={cn(
                                        "flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors",
                                        idx < sortOptions.length - 1 && "border-b border-white/[0.06]"
                                    )}
                                >
                                    <span className={cn(
                                        "text-[15px] flex-1 text-left",
                                        sortBy === option.value && "font-medium"
                                    )}>
                                        {option.label}
                                    </span>
                                    {sortBy === option.value && (
                                        <Check className="h-5 w-5 text-primary shrink-0" />
                                    )}
                                </button>
                            ))}
                        </>
                    ) : filterDetailKey === "show" ? (
                        <>
                            {showOptions.map((option, idx) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        if (option.value === "all") {
                                            setActiveTab("mine");
                                        } else {
                                            setActiveTab(option.value);
                                        }
                                        setFilterDetailKey(null);
                                    }}
                                    className={cn(
                                        "flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors",
                                        idx < showOptions.length - 1 && "border-b border-white/[0.06]"
                                    )}
                                >
                                    <span className={cn(
                                        "text-[15px] flex-1 text-left",
                                        (option.value === "all" && activeTab === "mine" && !hasShowFilter) || option.value === activeTab
                                            ? "font-medium"
                                            : ""
                                    )}>
                                        {option.label}
                                    </span>
                                    {((option.value === "all" && activeTab === "mine") || (option.value !== "all" && option.value === activeTab)) && (
                                        <Check className="h-5 w-5 text-primary shrink-0" />
                                    )}
                                </button>
                            ))}
                        </>
                    ) : (
                        <>
                            {/* Show filter */}
                            <button
                                onClick={() => setFilterDetailKey("show")}
                                className="flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Show</span>
                                <span className={cn(
                                    "text-[15px] mr-1.5 truncate max-w-[180px]",
                                    hasShowFilter ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {activeTab === "mine" ? "All Prompts" : activeTab === "shared" ? "Shared with Me" : "All Prompts"}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            {/* Sort By filter */}
                            <button
                                onClick={() => setFilterDetailKey("sortBy")}
                                className="flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Sort By</span>
                                <span className={cn(
                                    "text-[15px] mr-1.5 truncate max-w-[180px]",
                                    hasSortFilter ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {sortOptions.find(o => o.value === sortBy)?.label}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            {/* Coming Soon filters */}
                            <button
                                disabled
                                className="flex items-center w-full px-5 min-h-[52px] opacity-40 border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Tags</span>
                                <span className="text-[13px] text-muted-foreground mr-1.5">Coming Soon</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            <button
                                disabled
                                className="flex items-center w-full px-5 min-h-[52px] opacity-40 border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Categories</span>
                                <span className="text-[13px] text-muted-foreground mr-1.5">Coming Soon</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            {activeFilterCount > 0 && (
                                <div className="pt-4 pb-2">
                                    <p className="text-[13px] text-muted-foreground text-center">
                                        {activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </BottomSheetBody>
            </BottomSheet>

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