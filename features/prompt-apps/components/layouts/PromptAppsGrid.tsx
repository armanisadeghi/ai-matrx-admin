"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PromptAppCard } from "./PromptAppCard";
import { PromptAppListItem } from "./PromptAppListItem";
import { PromptAppsDesktopSearchBar } from "./PromptAppsDesktopSearchBar";
import { MobileActionBar, MobileFilterDrawer } from "@/components/official/mobile-action-bar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-service";
import { Plus, AppWindow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CreatePromptAppModal } from "@/features/prompt-apps/components/CreatePromptAppModal";
import type { PromptApp } from "@/features/prompt-apps/types";

interface PromptAppsGridProps {
    apps: PromptApp[];
}

const CARDS_DISPLAY_LIMIT_DESKTOP = 8;
const CARDS_DISPLAY_LIMIT_MOBILE = 4;

export function PromptAppsGrid({ apps }: PromptAppsGridProps) {
    const router = useRouter();
    const isMobile = useIsMobile();
    const cardsLimit = isMobile
        ? CARDS_DISPLAY_LIMIT_MOBILE
        : CARDS_DISPLAY_LIMIT_DESKTOP;
    const [isPending, startTransition] = useTransition();
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(new Set());
    const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [appToDelete, setAppToDelete] = useState<{
        id: string;
        name: string;
    } | null>(null);

    // Pagination state
    const [listPage, setListPage] = useState(1);
    const LIST_ITEMS_PER_PAGE = 20;

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("updated-desc");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    // Filter and sort
    const filteredApps = useMemo(() => {
        let filtered = apps.filter((app) => {
            // Status filter
            if (statusFilter !== "all" && app.status !== statusFilter) {
                return false;
            }

            // Search
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            return (
                app.name.toLowerCase().includes(searchLower) ||
                (app.tagline &&
                    app.tagline.toLowerCase().includes(searchLower)) ||
                (app.description &&
                    app.description.toLowerCase().includes(searchLower)) ||
                (app.tags &&
                    app.tags.some((tag) =>
                        tag.toLowerCase().includes(searchLower)
                    )) ||
                (app.category &&
                    app.category.toLowerCase().includes(searchLower))
            );
        });

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "executions-desc":
                    return (b.total_executions || 0) - (a.total_executions || 0);
                case "created-desc":
                    return (
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    );
                case "updated-desc":
                default:
                    return (
                        new Date(b.updated_at).getTime() -
                        new Date(a.updated_at).getTime()
                    );
            }
        });

        return filtered;
    }, [apps, searchTerm, sortBy, statusFilter]);

    // Split into cards and list items
    const appCards = useMemo(
        () => filteredApps.slice(0, cardsLimit),
        [filteredApps, cardsLimit]
    );
    const allListItems = useMemo(
        () => filteredApps.slice(cardsLimit),
        [filteredApps, cardsLimit]
    );
    const listItems = useMemo(
        () => allListItems.slice(0, listPage * LIST_ITEMS_PER_PAGE),
        [allListItems, listPage]
    );
    const hasMore = allListItems.length > listItems.length;

    // Reset pagination on search/filter change
    useMemo(() => {
        setListPage(1);
    }, [searchTerm, sortBy, statusFilter]);

    // Handlers
    const handleDeleteClick = (id: string) => {
        const app = apps.find((a) => a.id === id);
        if (app) {
            setAppToDelete({ id, name: app.name });
            setDeleteDialogOpen(true);
        }
    };

    const handleConfirmDelete = async () => {
        if (!appToDelete) return;

        const { id } = appToDelete;
        setDeletingIds((prev) => new Set(prev).add(id));

        try {
            const response = await fetch(`/api/prompt-apps/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete app");
            }

            router.refresh();
            toast.success("App deleted successfully!");
        } catch (error) {
            console.error("Error deleting app:", error);
            toast.error("Failed to delete app. Please try again.");
            setDeletingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        } finally {
            setDeleteDialogOpen(false);
            setAppToDelete(null);
        }
    };

    const handleDuplicate = async (id: string) => {
        setDuplicatingIds((prev) => new Set(prev).add(id));

        try {
            const response = await fetch(`/api/prompt-apps/${id}/duplicate`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to duplicate app");
            }

            router.refresh();
            toast.success("App duplicated successfully!");
        } catch (error) {
            console.error("Error duplicating app:", error);
            toast.error("Failed to duplicate app. Please try again.");
        } finally {
            setDuplicatingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    const handlePublishToggle = async (
        id: string,
        newStatus: "published" | "draft"
    ) => {
        setPublishingIds((prev) => new Set(prev).add(id));

        try {
            const response = await fetch(`/api/prompt-apps/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    ...(newStatus === "published"
                        ? { published_at: new Date().toISOString() }
                        : {}),
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to ${newStatus === "published" ? "publish" : "unpublish"} app`);
            }

            router.refresh();
            toast.success(
                newStatus === "published"
                    ? "App published successfully!"
                    : "App unpublished."
            );
        } catch (error) {
            console.error("Error toggling publish:", error);
            toast.error("Failed to update app status. Please try again.");
        } finally {
            setPublishingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    const handleNavigate = (id: string, path: string) => {
        if (navigatingId) return;

        setNavigatingId(id);
        startTransition(() => {
            router.push(path);
        });
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setAppToDelete(null);
    };

    const hasActiveFilters =
        searchTerm !== "" ||
        sortBy !== "updated-desc" ||
        statusFilter !== "all";

    // Mobile filter config
    const filterConfig = {
        fields: [
            {
                id: "sortBy",
                label: "Sort By",
                type: "select" as const,
                options: [
                    { value: "updated-desc", label: "Recently Updated" },
                    { value: "created-desc", label: "Recently Created" },
                    { value: "name-asc", label: "Name (A-Z)" },
                    { value: "name-desc", label: "Name (Z-A)" },
                    { value: "executions-desc", label: "Most Runs" },
                ],
            },
            {
                id: "statusFilter",
                label: "Status",
                type: "select" as const,
                options: [
                    { value: "all", label: "All" },
                    { value: "published", label: "Published" },
                    { value: "draft", label: "Draft" },
                    { value: "archived", label: "Archived" },
                ],
            },
        ],
        entityLabel: "apps",
        entityLabelSingular: "app",
    };

    const activeFilters = { sortBy, statusFilter };

    const handleFiltersChange = (
        filters: Record<string, string | string[] | boolean>
    ) => {
        if (filters.sortBy && typeof filters.sortBy === "string") {
            setSortBy(filters.sortBy);
        }
        if (filters.statusFilter && typeof filters.statusFilter === "string") {
            setStatusFilter(filters.statusFilter);
        }
    };

    // Count stats
    const publishedCount = apps.filter((a) => a.status === "published").length;
    const draftCount = apps.filter((a) => a.status === "draft").length;

    return (
        <>
            {/* Desktop Search Bar */}
            {!isMobile && (
                <PromptAppsDesktopSearchBar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    onFilterClick={() => setIsFilterModalOpen(true)}
                    onNewClick={() => setIsNewModalOpen(true)}
                    showFilterBadge={hasActiveFilters}
                />
            )}

            {/* Stats Row (desktop only) */}
            {!isMobile && apps.length > 0 && (
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        My Apps
                        <Badge variant="secondary" className="font-normal py-0.25 px-1.5 text-xs">
                            {filteredApps.length}
                        </Badge>
                    </h2>
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            onClick={() =>
                                setStatusFilter(
                                    statusFilter === "published"
                                        ? "all"
                                        : "published"
                                )
                            }
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                statusFilter === "published"
                                    ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                        >
                            Published ({publishedCount})
                        </button>
                        <button
                            onClick={() =>
                                setStatusFilter(
                                    statusFilter === "draft" ? "all" : "draft"
                                )
                            }
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                statusFilter === "draft"
                                    ? "bg-secondary/20 text-secondary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                        >
                            Drafts ({draftCount})
                        </button>
                        {statusFilter !== "all" && (
                            <button
                                onClick={() => setStatusFilter("all")}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                                Show All
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {apps.length === 0 ? (
                <div className={cn("mb-8", isMobile && "pb-24")}>
                    <div className="border border-primary/20 rounded-xl p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <AppWindow className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">
                                    Create Your First App
                                </h3>
                                <p className="text-muted-foreground">
                                    Turn your prompts into shareable,
                                    public-facing apps with custom UIs
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    onClick={() => setIsNewModalOpen(true)}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New App
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : filteredApps.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        No apps match your filters. Try adjusting your search or
                        filters.
                    </p>
                </div>
            ) : (
                <>
                    {/* Cards Grid */}
                    {appCards.length > 0 && (
                        <div
                            className={cn(
                                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
                                listItems.length === 0 &&
                                    isMobile &&
                                    "pb-24"
                            )}
                        >
                            {appCards.map((app) => (
                                <PromptAppCard
                                    key={app.id}
                                    app={app}
                                    onDelete={handleDeleteClick}
                                    onDuplicate={handleDuplicate}
                                    onNavigate={handleNavigate}
                                    onPublishToggle={handlePublishToggle}
                                    isDeleting={deletingIds.has(app.id)}
                                    isDuplicating={duplicatingIds.has(app.id)}
                                    isPublishing={publishingIds.has(app.id)}
                                    isNavigating={navigatingId === app.id}
                                    isAnyNavigating={navigatingId !== null}
                                />
                            ))}
                        </div>
                    )}

                    {/* List Items */}
                    {listItems.length > 0 && (
                        <>
                            <div
                                className={cn(
                                    "mt-6 grid gap-3",
                                    "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                                    !hasMore && isMobile && "mb-24"
                                )}
                            >
                                {listItems.map((app) => (
                                    <PromptAppListItem
                                        key={app.id}
                                        app={app}
                                        onDelete={handleDeleteClick}
                                        onDuplicate={handleDuplicate}
                                        onNavigate={handleNavigate}
                                        onPublishToggle={handlePublishToggle}
                                        isDeleting={deletingIds.has(app.id)}
                                        isDuplicating={duplicatingIds.has(
                                            app.id
                                        )}
                                        isPublishing={publishingIds.has(
                                            app.id
                                        )}
                                        isNavigating={navigatingId === app.id}
                                        isAnyNavigating={
                                            navigatingId !== null
                                        }
                                    />
                                ))}
                            </div>

                            {/* Show More */}
                            {hasMore && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setListPage((prev) => prev + 1)
                                        }
                                        className="w-full md:w-auto"
                                    >
                                        Show More (
                                        {allListItems.length - listItems.length}{" "}
                                        remaining)
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Mobile Action Bar */}
            <MobileActionBar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                totalCount={apps.length}
                filteredCount={filteredApps.length}
                onPrimaryAction={() => setIsNewModalOpen(true)}
                primaryActionLabel="New App"
                primaryActionIcon={<Plus className="h-5 w-5" />}
                showFilterButton={true}
                showVoiceSearch={true}
                isFilterModalOpen={isFilterModalOpen}
                setIsFilterModalOpen={setIsFilterModalOpen}
                searchPlaceholder="Search apps..."
            />

            {/* Modals */}
            <CreatePromptAppModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
            />

            <MobileFilterDrawer
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                filterConfig={filterConfig}
                activeFilters={activeFilters}
                onFiltersChange={handleFiltersChange}
                totalCount={apps.length}
                filteredCount={filteredApps.length}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                            Delete App
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{appToDelete?.name}
                            &quot;? This action cannot be undone and will
                            permanently remove the app and all its execution
                            history.
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
                            Delete App
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
