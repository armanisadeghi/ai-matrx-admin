"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { PromptCard } from "./PromptCard";
import { SharedPromptCard } from "./SharedPromptCard";
import { PromptListItem } from "./PromptListItem";
import { SharedPromptListItem } from "./SharedPromptListItem";
import { MobileActionBar } from "@/components/official/mobile-action-bar";
import { BottomSheet, BottomSheetHeader, BottomSheetBody } from "@/components/official/bottom-sheet";
import { Check, ChevronRight, RotateCcw, X, Search } from "lucide-react";
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
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
    selectAllUserPrompts,
    selectSharedPrompts,
    selectPromptsListStatus,
} from "@/lib/redux/slices/promptCacheSlice";
import {
    deleteUserPrompt,
    duplicateUserPrompt,
} from "@/lib/redux/thunks/promptCrudThunks";
import { SharedPrompt } from "../../types/shared";
import type { PromptData } from "../../types/core";
import { usePromptFilters, NONE_SENTINEL } from "../../hooks/usePromptFilters";
import type { PromptTab, PromptSortOption, FavFilter, ArchFilter } from "../../hooks/usePromptFilters";
import { usePromptsBasePath } from "../../hooks/usePromptsBasePath";

// Threshold constants for hybrid card/list layout
const CARDS_DISPLAY_LIMIT_DESKTOP = 8;
const CARDS_DISPLAY_LIMIT_MOBILE = 4;

/** Lightweight skeleton shown while the initial fetch is in-flight */
function PromptsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-5 space-y-3 animate-pulse">
                    <div className="h-5 w-2/3 rounded bg-muted" />
                    <div className="space-y-2">
                        <div className="h-3 w-full rounded bg-muted" />
                        <div className="h-3 w-4/5 rounded bg-muted" />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <div className="h-8 w-16 rounded bg-muted" />
                        <div className="h-8 w-16 rounded bg-muted" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function PromptsGrid() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const isMobile = useIsMobile();
    const basePath = usePromptsBasePath();

    // Read from Redux — updated reactively after every mutation
    const prompts = useAppSelector(selectAllUserPrompts);
    const sharedPrompts = useAppSelector(selectSharedPrompts);
    const listStatus = useAppSelector(selectPromptsListStatus);
    const isLoading = listStatus === 'idle' || listStatus === 'loading';

    const cardsLimit = isMobile ? CARDS_DISPLAY_LIMIT_MOBILE : CARDS_DISPLAY_LIMIT_DESKTOP;
    const [isPending, startTransition] = useTransition();
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [promptToDelete, setPromptToDelete] = useState<{ id: string; name: string } | null>(null);

    // URL-backed filter state (bookmarkable, shareable, history-aware)
    const {
        tab: activeTab,
        sortBy,
        searchTerm,
        excludedCats,
        excludedTags,
        favFilter,
        archFilter,
        favoritesFirst,
        setTab: setActiveTab,
        setSortBy,
        setSearchTerm,
        setExcludedCats,
        setExcludedTags,
        setFavFilter,
        setArchFilter,
        setFavoritesFirst,
        resetFilters,
        hasActiveFilters,
        isSearching,
    } = usePromptFilters();

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    const hasShared = sharedPrompts.length > 0;

    // Pagination — stays local: resets naturally when filters change, no URL clutter
    const [promptListPage, setPromptListPage] = useState(1);
    const [sharedListPage, setSharedListPage] = useState(1);
    const LIST_ITEMS_PER_PAGE = 20;

    // Derived: all unique categories and tags across owned prompts (for filter UIs)
    const allCategories = useMemo(() => {
        const cats = new Set<string>();
        prompts.forEach((p) => { if (p.category) cats.add(p.category); });
        return Array.from(cats).sort();
    }, [prompts]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        prompts.forEach((p) => { p.tags?.forEach((t) => tags.add(t)); });
        return Array.from(tags).sort();
    }, [prompts]);

    // Filter and sort prompts
    const filteredPrompts = useMemo(() => {
        let filtered = prompts.filter((prompt) => {
            // Archived radio filter
            if (archFilter === "active"   && prompt.isArchived)  return false;
            if (archFilter === "archived" && !prompt.isArchived) return false;
            // "both" passes everything through

            // Favorites radio filter
            if (favFilter === "yes" && !prompt.isFavorite) return false;
            if (favFilter === "no"  &&  prompt.isFavorite) return false;
            // "all" passes everything through

            // Categories: EXCLUSION model — hide prompts whose category is excluded.
            // NONE_SENTINEL in exclusions = hide uncategorized prompts.
            if (excludedCats.length > 0) {
                const isUncategorized = !prompt.category;
                if (isUncategorized && excludedCats.includes(NONE_SENTINEL)) return false;
                if (!isUncategorized && excludedCats.includes(prompt.category!)) return false;
            }

            // Tags: EXCLUSION model — hide prompts that have ANY excluded tag.
            // NONE_SENTINEL in exclusions = hide untagged prompts.
            if (excludedTags.length > 0) {
                const isUntagged = !(prompt.tags?.length);
                if (isUntagged && excludedTags.includes(NONE_SENTINEL)) return false;
                if (!isUntagged && prompt.tags?.some(t => excludedTags.includes(t))) return false;
            }

            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                if (!(
                    prompt.id?.toLowerCase().includes(q) ||
                    prompt.name?.toLowerCase().includes(q) ||
                    prompt.description?.toLowerCase().includes(q) ||
                    prompt.category?.toLowerCase().includes(q) ||
                    prompt.modelId?.toLowerCase().includes(q) ||
                    prompt.outputFormat?.toLowerCase().includes(q) ||
                    prompt.tags?.some(t => t.toLowerCase().includes(q)) ||
                    prompt.messages?.some(m =>
                        m.content?.toLowerCase().includes(q) ||
                        m.role?.toLowerCase().includes(q)
                    ) ||
                    prompt.variableDefaults?.some(v =>
                        v.name?.toLowerCase().includes(q) ||
                        v.defaultValue?.toLowerCase().includes(q) ||
                        v.helpText?.toLowerCase().includes(q)
                    )
                )) return false;
            }

            return true;
        });

        filtered.sort((a, b) => {
            // Pin favorites to the top (secondary sort) when favoritesFirst is on
            // and we're not already scoped to one favorites group
            if (favoritesFirst && favFilter === "all") {
                const aFav = a.isFavorite ? 1 : 0;
                const bFav = b.isFavorite ? 1 : 0;
                if (bFav !== aFav) return bFav - aFav;
            }

            switch (sortBy) {
                case "name-asc":
                    return (a.name ?? "").localeCompare(b.name ?? "");
                case "name-desc":
                    return (b.name ?? "").localeCompare(a.name ?? "");
                case "created-desc":
                    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
                case "category-asc":
                    return (a.category ?? "").localeCompare(b.category ?? "");
                case "updated-desc":
                default:
                    return (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
            }
        });

        return filtered;
    }, [prompts, searchTerm, sortBy, excludedCats, excludedTags, favFilter, archFilter, favoritesFirst]);

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

        filtered.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "updated-desc":
                case "created-desc":
                case "category-asc":
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
    useEffect(() => {
        setPromptListPage(1);
        setSharedListPage(1);
    }, [searchTerm, sortBy, excludedCats, excludedTags, favFilter, archFilter, favoritesFirst]);

    // Mobile auto-pagination sentinels
    const promptSentinelRef = useRef<HTMLDivElement>(null);
    const sharedSentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMobile) return;
        const el = promptSentinelRef.current;
        if (!el || !hasMorePrompts) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setPromptListPage(prev => prev + 1); },
            { rootMargin: '300px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [isMobile, hasMorePrompts]);

    useEffect(() => {
        if (!isMobile) return;
        const el = sharedSentinelRef.current;
        if (!el || !hasMoreShared) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setSharedListPage(prev => prev + 1); },
            { rootMargin: '300px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [isMobile, hasMoreShared]);

    const handleDeleteClick = (id: string, name: string) => {
        setPromptToDelete({ id, name });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!promptToDelete) return;

        const { id, name } = promptToDelete;
        setDeletingIds(prev => new Set(prev).add(id));
        setDeleteDialogOpen(false);
        setPromptToDelete(null);

        try {
            await dispatch(deleteUserPrompt(id)).unwrap();
            // Redux removes the record from the list — no router.refresh() needed
            toast.success("Prompt deleted successfully!");
        } catch (error) {
            console.error("Error deleting prompt:", error);
            toast.error("Failed to delete prompt. Please try again.");
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleDuplicate = async (id: string) => {
        setDuplicatingIds(prev => new Set(prev).add(id));

        try {
            await dispatch(duplicateUserPrompt(id)).unwrap();
            // Redux prepends the copy to the list — no router.refresh() needed
            toast.success("Prompt duplicated successfully!");
        } catch (error) {
            console.error("Error duplicating prompt:", error);
            toast.error("Failed to duplicate prompt. Please try again.");
        } finally {
            setDuplicatingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    // Handler for duplicating shared prompts (copy to my prompts)
    const handleDuplicateShared = async (id: string) => {
        setDuplicatingIds(prev => new Set(prev).add(id));

        try {
            await dispatch(duplicateUserPrompt(id)).unwrap();
            // Redux prepends the copy to the owned list — tab switches automatically
            toast.success("Prompt copied to your prompts!");
        } catch (error) {
            console.error("Error copying shared prompt:", error);
            toast.error("Failed to copy prompt. Please try again.");
        } finally {
            setDuplicatingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
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


    const sortOptions = [
        { value: "updated-desc", label: "Recently Updated" },
        { value: "created-desc", label: "Recently Created" },
        { value: "name-asc", label: "Name (A-Z)" },
        { value: "name-desc", label: "Name (Z-A)" },
        { value: "category-asc", label: "Category (A-Z)" },
    ];

    const showOptions: { value: PromptTab | "all"; label: string }[] = [
        { value: "all", label: "All Prompts" },
        { value: "mine", label: "My Prompts" },
        { value: "shared", label: "Shared with Me" },
    ];
    const [filterDetailKey, setFilterDetailKey] = useState<string | null>(null);
    const [listSearchQ, setListSearchQ] = useState("");

    const hasSortFilter     = sortBy !== "updated-desc";
    const hasShowFilter     = activeTab !== "mine";
    const hasCatsFilter     = excludedCats.length > 0;
    const hasTagsFilter     = excludedTags.length > 0;
    const hasFavFilter      = favFilter !== "all";
    const hasArchFilter     = archFilter !== "active";
    const hasFavFirstOff    = !favoritesFirst;

    const categoryLabel = hasCatsFilter
        ? `${excludedCats.length} hidden`
        : "All";

    const tagsLabel = hasTagsFilter
        ? `${excludedTags.length} hidden`
        : "All";

    const archLabel =
        archFilter === "archived" ? "Archived"
        : archFilter === "both"   ? "All"
        : "Active";

    const favLabel =
        favFilter === "yes" ? "Favorites"
        : favFilter === "no" ? "Not Favorites"
        : "All";

    const activeFilterCount =
        (hasSortFilter  ? 1 : 0) +
        (hasShowFilter  ? 1 : 0) +
        (hasCatsFilter  ? 1 : 0) +
        (hasTagsFilter  ? 1 : 0) +
        (hasFavFilter   ? 1 : 0) +
        (hasArchFilter  ? 1 : 0) +
        (hasFavFirstOff ? 1 : 0);

    const handleFilterModalChange = (open: boolean) => {
        setIsFilterModalOpen(open);
        if (!open) { setFilterDetailKey(null); setListSearchQ(""); }
    };

    const handleFilterDetailKey = (key: string | null) => {
        setFilterDetailKey(key);
        setListSearchQ("");
    };


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
                    activeFilterCount={activeFilterCount}
                />
            )}

            {/* Pill Tabs — only shown when the user has shared prompts */}
            {hasShared && (
                <div className="flex items-center gap-1 mb-3 pl-1">
                    <button
                        onClick={() => setActiveTab("mine")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${activeTab === "mine"
                                ? "bg-primary text-primary-foreground"
                                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                    >
                        Mine
                        <span className="text-[10px] opacity-70">{filteredPrompts.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("shared")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${activeTab === "shared"
                                ? "bg-primary text-primary-foreground"
                                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                    >
                        Shared
                        <span className="text-[10px] opacity-70">{filteredSharedPrompts.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${activeTab === "all"
                                ? "bg-primary text-primary-foreground"
                                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                    >
                        All
                        <span className="text-[10px] opacity-70">{filteredPrompts.length + filteredSharedPrompts.length}</span>
                    </button>
                </div>
            )}

            {/* Active Tab Content */}
            <div className={cn(isMobile && "pb-24")}>
                {activeTab === "mine" ? (
                    <>
                        {isLoading ? (
                            <PromptsSkeleton count={cardsLimit} />
                        ) : prompts.length === 0 ? (
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
                                                onClick={() => router.push(`${basePath}/templates`)}
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
                                                promptData={prompt}
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
                                                    promptData={prompt}
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
                                            isMobile ? (
                                                <div ref={promptSentinelRef} className="h-8" />
                                            ) : (
                                                <div className="mt-4 flex justify-center">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setPromptListPage(prev => prev + 1)}
                                                        className="w-full md:w-auto"
                                                    >
                                                        Show More ({allPromptListItems.length - promptListItems.length} remaining)
                                                    </Button>
                                                </div>
                                            )
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </>
                ) : activeTab === "shared" ? (
                    /* Shared Tab */
                    <>
                        {isLoading ? (
                            <PromptsSkeleton count={cardsLimit} />
                        ) : filteredSharedPrompts.length === 0 ? (
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
                                            isMobile ? (
                                                <div ref={sharedSentinelRef} className="h-8" />
                                            ) : (
                                                <div className="mt-4 flex justify-center">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setSharedListPage(prev => prev + 1)}
                                                        className="w-full md:w-auto"
                                                    >
                                                        Show More ({allSharedListItems.length - sharedPromptListItems.length} remaining)
                                                    </Button>
                                                </div>
                                            )
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    /* All Tab — owned prompts first, shared below with a divider */
                    <>
                        {/* Owned section */}
                        {filteredPrompts.length > 0 && (
                            <>
                                {filteredPrompts.length > 0 && hasShared && (
                                    <p className="text-xs font-medium text-muted-foreground mb-3">My Prompts</p>
                                )}
                                {promptCards.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {promptCards.map((prompt) => (
                                            <PromptCard
                                                key={prompt.id}
                                                id={prompt.id}
                                                name={prompt.name}
                                                description={prompt.description}
                                                promptData={prompt}
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
                                                    promptData={prompt}
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
                                            isMobile ? (
                                                <div ref={promptSentinelRef} className="h-8" />
                                            ) : (
                                                <div className="mt-4 flex justify-center">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setPromptListPage(prev => prev + 1)}
                                                        className="w-full md:w-auto"
                                                    >
                                                        Show More ({allPromptListItems.length - promptListItems.length} remaining)
                                                    </Button>
                                                </div>
                                            )
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Divider between sections (only when both have results) */}
                        {filteredPrompts.length > 0 && filteredSharedPrompts.length > 0 && (
                            <div className="flex items-center gap-3 my-6">
                                <div className="flex-1 border-t border-border" />
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground font-medium">Shared with me</span>
                                </div>
                                <div className="flex-1 border-t border-border" />
                            </div>
                        )}

                        {/* Shared section */}
                        {filteredSharedPrompts.length > 0 && (
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
                                            isMobile ? (
                                                <div ref={sharedSentinelRef} className="h-8" />
                                            ) : (
                                                <div className="mt-4 flex justify-center">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setSharedListPage(prev => prev + 1)}
                                                        className="w-full md:w-auto"
                                                    >
                                                        Show More ({allSharedListItems.length - sharedPromptListItems.length} remaining)
                                                    </Button>
                                                </div>
                                            )
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Loading state for 'all' tab */}
                        {isLoading && (
                            <PromptsSkeleton count={cardsLimit} />
                        )}

                        {/* Empty state for 'all' tab */}
                        {!isLoading && filteredPrompts.length === 0 && filteredSharedPrompts.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">
                                    {searchTerm ? "No prompts match your search." : "You have no prompts yet."}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* "Also found in" cross-tab — only on mine/shared tabs, not 'all' (both visible already) */}
                {isSearching && hasShared && activeTab !== "all" && otherTabFiltered.length > 0 && (
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
                                        promptData={activeTab === "shared" ? prompt as PromptData : undefined}
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
                        filterDetailKey === "sortBy"   ? "Sort By"
                        : filterDetailKey === "show"   ? "Show"
                        : filterDetailKey === "cats"   ? "Category"
                        : filterDetailKey === "tags"   ? "Tags"
                        : filterDetailKey === "fav"    ? "Favorites"
                        : filterDetailKey === "arch"   ? "Archived"
                        : "Filters"
                    }
                    showBack={filterDetailKey !== null}
                    onBack={() => handleFilterDetailKey(null)}
                    trailing={
                        !filterDetailKey && activeFilterCount > 0 ? (
                            <button
                                onClick={resetFilters}
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
                    {/* ── Sort By ─────────────────────────────────────────── */}
                    {filterDetailKey === "sortBy" ? (
                        <>
                            {sortOptions.map((option, idx) => (
                                <button
                                    key={option.value}
                                    onClick={() => { setSortBy(option.value as PromptSortOption); handleFilterDetailKey(null); }}
                                    className={cn(
                                        "flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors",
                                        idx < sortOptions.length - 1 && "border-b border-white/[0.06]"
                                    )}
                                >
                                    <span className={cn("text-[15px] flex-1 text-left", sortBy === option.value && "font-medium")}>
                                        {option.label}
                                    </span>
                                    {sortBy === option.value && <Check className="h-5 w-5 text-primary shrink-0" />}
                                </button>
                            ))}
                        </>

                    ) : filterDetailKey === "show" ? (
                    /* ── Show (tab) ─────────────────────────────────────── */
                        <>
                            {showOptions.map((option, idx) => {
                                const isActive = option.value === "all" ? activeTab === "mine" : option.value === activeTab;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setActiveTab(option.value === "all" ? "mine" : option.value as PromptTab);
                                            handleFilterDetailKey(null);
                                        }}
                                        className={cn(
                                            "flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors",
                                            idx < showOptions.length - 1 && "border-b border-white/[0.06]"
                                        )}
                                    >
                                        <span className={cn("text-[15px] flex-1 text-left", isActive && "font-medium")}>
                                            {option.label}
                                        </span>
                                        {isActive && <Check className="h-5 w-5 text-primary shrink-0" />}
                                    </button>
                                );
                            })}
                        </>

                    ) : filterDetailKey === "cats" ? (
                    /* ── Category (multi-select checkbox list) ──────────── */
                        <>
                            {/* Sticky header: search + Select All / Clear All */}
                            <div className="sticky top-0 z-10 px-4 pt-2 pb-3 border-b border-white/[0.06] space-y-2" style={{ background: "var(--glass-bg-subtle)", backdropFilter: "blur(20px)" }}>
                                <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Find a category…"
                                        value={listSearchQ}
                                        onChange={e => setListSearchQ(e.target.value)}
                                        className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                                        style={{ fontSize: "16px" }}
                                    />
                                    {listSearchQ && (
                                        <button onClick={() => setListSearchQ("")} className="text-muted-foreground hover:text-foreground transition-colors">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setExcludedCats([])}
                                        className="flex-1 h-8 rounded-lg border border-white/[0.12] text-[13px] font-medium text-foreground active:bg-white/10 transition-colors bg-white/[0.04] hover:bg-white/[0.08]"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => {
                                            const allCatValues = [NONE_SENTINEL, ...allCategories];
                                            setExcludedCats(allCatValues);
                                        }}
                                        className="flex-1 h-8 rounded-lg border border-white/[0.12] text-[13px] font-medium text-muted-foreground active:bg-white/10 transition-colors bg-white/[0.04] hover:bg-white/[0.08]"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            {/* Uncategorized item */}
                            {!listSearchQ && (() => {
                                const isVisible = !excludedCats.includes(NONE_SENTINEL);
                                return (
                                    <button
                                        onClick={() => setExcludedCats(
                                            isVisible
                                                ? [...excludedCats, NONE_SENTINEL]
                                                : excludedCats.filter(c => c !== NONE_SENTINEL)
                                        )}
                                        className="flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center mr-3 shrink-0 transition-colors",
                                            isVisible ? "bg-primary border-primary" : "border-muted-foreground/40"
                                        )}>
                                            {isVisible && <Check className="h-3 w-3 text-primary-foreground" />}
                                        </div>
                                        <span className={cn("text-[15px] flex-1 text-left italic", !isVisible && "line-through text-muted-foreground/50")}>
                                            Uncategorized
                                        </span>
                                    </button>
                                );
                            })()}
                            {/* Category items — checked = visible, unchecked = excluded */}
                            {allCategories
                                .filter(cat => !listSearchQ || cat.toLowerCase().includes(listSearchQ.toLowerCase()))
                                .map((cat, idx, arr) => {
                                const isVisible = !excludedCats.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setExcludedCats(
                                            isVisible
                                                ? [...excludedCats, cat]
                                                : excludedCats.filter(c => c !== cat)
                                        )}
                                        className={cn(
                                            "flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors",
                                            idx < arr.length - 1 && "border-b border-white/[0.06]"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center mr-3 shrink-0 transition-colors",
                                            isVisible ? "bg-primary border-primary" : "border-muted-foreground/40"
                                        )}>
                                            {isVisible && <Check className="h-3 w-3 text-primary-foreground" />}
                                        </div>
                                        <span className={cn("text-[15px] flex-1 text-left", !isVisible && "line-through text-muted-foreground/50")}>
                                            {cat}
                                        </span>
                                    </button>
                                );
                            })}
                            {allCategories.length === 0 && (
                                <div className="px-5 py-6 text-center text-sm text-muted-foreground">No categories yet</div>
                            )}
                            {allCategories.length > 0 && listSearchQ && allCategories.filter(c => c.toLowerCase().includes(listSearchQ.toLowerCase())).length === 0 && (
                                <div className="px-5 py-6 text-center text-sm text-muted-foreground">No matching categories</div>
                            )}
                        </>

                    ) : filterDetailKey === "tags" ? (
                    /* ── Tags (multi-select checkbox list) ──────────────── */
                        <>
                            {/* Sticky header: search + Select All / Clear All */}
                            <div className="sticky top-0 z-10 px-4 pt-2 pb-3 border-b border-white/[0.06] space-y-2" style={{ background: "var(--glass-bg-subtle)", backdropFilter: "blur(20px)" }}>
                                <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Find a tag…"
                                        value={listSearchQ}
                                        onChange={e => setListSearchQ(e.target.value)}
                                        className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                                        style={{ fontSize: "16px" }}
                                    />
                                    {listSearchQ && (
                                        <button onClick={() => setListSearchQ("")} className="text-muted-foreground hover:text-foreground transition-colors">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setExcludedTags([])}
                                        className="flex-1 h-8 rounded-lg border border-white/[0.12] text-[13px] font-medium text-foreground active:bg-white/10 transition-colors bg-white/[0.04] hover:bg-white/[0.08]"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => {
                                            const allTagValues = [NONE_SENTINEL, ...allTags];
                                            setExcludedTags(allTagValues);
                                        }}
                                        className="flex-1 h-8 rounded-lg border border-white/[0.12] text-[13px] font-medium text-muted-foreground active:bg-white/10 transition-colors bg-white/[0.04] hover:bg-white/[0.08]"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            {/* "No tags" item */}
                            {!listSearchQ && (() => {
                                const isVisible = !excludedTags.includes(NONE_SENTINEL);
                                return (
                                    <button
                                        onClick={() => setExcludedTags(
                                            isVisible
                                                ? [...excludedTags, NONE_SENTINEL]
                                                : excludedTags.filter(t => t !== NONE_SENTINEL)
                                        )}
                                        className="flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center mr-3 shrink-0 transition-colors",
                                            isVisible ? "bg-primary border-primary" : "border-muted-foreground/40"
                                        )}>
                                            {isVisible && <Check className="h-3 w-3 text-primary-foreground" />}
                                        </div>
                                        <span className={cn("text-[15px] flex-1 text-left italic", !isVisible && "line-through text-muted-foreground/50")}>
                                            No tags
                                        </span>
                                    </button>
                                );
                            })()}
                            {/* Tag items — checked = visible, unchecked = excluded */}
                            {allTags
                                .filter(tag => !listSearchQ || tag.toLowerCase().includes(listSearchQ.toLowerCase()))
                                .map((tag, idx, arr) => {
                                const isVisible = !excludedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => setExcludedTags(
                                            isVisible
                                                ? [...excludedTags, tag]
                                                : excludedTags.filter(t => t !== tag)
                                        )}
                                        className={cn(
                                            "flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors",
                                            idx < arr.length - 1 && "border-b border-white/[0.06]"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center mr-3 shrink-0 transition-colors",
                                            isVisible ? "bg-primary border-primary" : "border-muted-foreground/40"
                                        )}>
                                            {isVisible && <Check className="h-3 w-3 text-primary-foreground" />}
                                        </div>
                                        <span className={cn("text-[15px] flex-1 text-left", !isVisible && "line-through text-muted-foreground/50")}>
                                            {tag}
                                        </span>
                                    </button>
                                );
                            })}
                            {allTags.length === 0 && (
                                <div className="px-5 py-6 text-center text-sm text-muted-foreground">No tags yet</div>
                            )}
                            {allTags.length > 0 && listSearchQ && allTags.filter(t => t.toLowerCase().includes(listSearchQ.toLowerCase())).length === 0 && (
                                <div className="px-5 py-6 text-center text-sm text-muted-foreground">No matching tags</div>
                            )}
                        </>

                    ) : filterDetailKey === "fav" ? (
                    /* ── Favorites (radio) ──────────────────────────────── */
                        <>
                            {([
                                { value: "all", label: "All" },
                                { value: "yes", label: "Favorites only" },
                                { value: "no",  label: "Not favorites" },
                            ] as { value: FavFilter; label: string }[]).map((opt, idx, arr) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setFavFilter(opt.value); handleFilterDetailKey(null); }}
                                    className={cn(
                                        "flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors",
                                        idx < arr.length - 1 && "border-b border-white/[0.06]"
                                    )}
                                >
                                    <span className={cn("text-[15px] flex-1 text-left", favFilter === opt.value && "font-medium")}>
                                        {opt.label}
                                    </span>
                                    {favFilter === opt.value && <Check className="h-5 w-5 text-primary shrink-0" />}
                                </button>
                            ))}
                        </>

                    ) : filterDetailKey === "arch" ? (
                    /* ── Archived (radio) ───────────────────────────────── */
                        <>
                            {([
                                { value: "active",   label: "Active (not archived)" },
                                { value: "archived", label: "Archived only" },
                                { value: "both",     label: "All (active + archived)" },
                            ] as { value: ArchFilter; label: string }[]).map((opt, idx, arr) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setArchFilter(opt.value); handleFilterDetailKey(null); }}
                                    className={cn(
                                        "flex items-center w-full px-5 min-h-[44px] active:bg-white/5 transition-colors",
                                        idx < arr.length - 1 && "border-b border-white/[0.06]"
                                    )}
                                >
                                    <span className={cn("text-[15px] flex-1 text-left", archFilter === opt.value && "font-medium")}>
                                        {opt.label}
                                    </span>
                                    {archFilter === opt.value && <Check className="h-5 w-5 text-primary shrink-0" />}
                                </button>
                            ))}
                        </>

                    ) : (
                    /* ── Main filter menu ───────────────────────────────── */
                        <>
                            {/* Show (tab) */}
                            <button
                                onClick={() => handleFilterDetailKey("show")}
                                className="flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Show</span>
                                <span className={cn("text-[15px] mr-1.5 truncate max-w-[180px]", hasShowFilter ? "text-foreground" : "text-muted-foreground")}>
                                    {activeTab === "mine" ? "My Prompts" : activeTab === "shared" ? "Shared with Me" : "All"}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            {/* Sort By */}
                            <button
                                onClick={() => handleFilterDetailKey("sortBy")}
                                className="flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Sort By</span>
                                <span className={cn("text-[15px] mr-1.5 truncate max-w-[180px]", hasSortFilter ? "text-foreground" : "text-muted-foreground")}>
                                    {sortOptions.find(o => o.value === sortBy)?.label}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            {/* Favorites */}
                            <button
                                onClick={() => handleFilterDetailKey("fav")}
                                className="flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Favorites</span>
                                <span className={cn("text-[15px] mr-1.5 truncate max-w-[180px]", hasFavFilter ? "text-foreground" : "text-muted-foreground")}>
                                    {favLabel}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            {/* Archived */}
                            <button
                                onClick={() => handleFilterDetailKey("arch")}
                                className="flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Archived</span>
                                <span className={cn("text-[15px] mr-1.5 truncate max-w-[180px]", hasArchFilter ? "text-foreground" : "text-muted-foreground")}>
                                    {archLabel}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            {/* Category */}
                            <button
                                onClick={() => handleFilterDetailKey("cats")}
                                className="flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Category</span>
                                <span className={cn("text-[15px] mr-1.5 truncate max-w-[180px]", hasCatsFilter ? "text-foreground" : "text-muted-foreground")}>
                                    {categoryLabel}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            {/* Tags */}
                            <button
                                onClick={() => handleFilterDetailKey("tags")}
                                className="flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Tags</span>
                                <span className={cn("text-[15px] mr-1.5 truncate max-w-[180px]", hasTagsFilter ? "text-foreground" : "text-muted-foreground")}>
                                    {tagsLabel}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            </button>

                            {/* Favorites First (inline toggle) */}
                            <button
                                onClick={() => setFavoritesFirst(!favoritesFirst)}
                                className="flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors border-b border-white/[0.06]"
                            >
                                <span className="text-[15px] font-medium flex-1 text-left">Favorites First</span>
                                <div className={cn(
                                    "w-9 h-5 rounded-full relative transition-colors shrink-0",
                                    favoritesFirst ? "bg-primary" : "bg-muted border border-border"
                                )}>
                                    <span className={cn(
                                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                                        favoritesFirst ? "left-4" : "left-0.5"
                                    )} />
                                </div>
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