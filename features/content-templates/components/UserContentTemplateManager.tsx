"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Plus, X, FileText, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ui/use-toast";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ContentTemplateDB, MessageRole } from "@/features/content-templates/types/content-templates-db";
import {
    fetchContentTemplates,
    deleteTemplate,
    clearTemplateCache,
} from "@/features/content-templates/services/content-templates-service";
import { ContentTemplatesPageHeader } from "./ContentTemplatesPageHeader";
import { TemplateCard } from "./TemplateCard";
import { TemplateActionDrawer } from "./TemplateActionDrawer";
import { createClient } from "@/utils/supabase/client";

const MESSAGE_ROLES: { value: MessageRole | "all"; label: string }[] = [
    { value: "all", label: "All Types" },
    { value: "system", label: "System" },
    { value: "user", label: "User" },
    { value: "assistant", label: "Assistant" },
    { value: "tool", label: "Tool" },
];

type ActiveTab = "my" | "public";

interface FloatingSearchBarProps {
    searchValue: string;
    onSearchChange: (v: string) => void;
    onFilterClick: () => void;
    onNewClick: () => void;
    showFilterBadge?: boolean;
}

function FloatingSearchBar({
    searchValue,
    onSearchChange,
    onFilterClick,
    onNewClick,
    showFilterBadge,
}: FloatingSearchBarProps) {
    const isMobile = useIsMobile();
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [local, setLocal] = useState(searchValue);

    useEffect(() => { setLocal(searchValue); }, [searchValue]);

    const handleChange = (v: string) => {
        setLocal(v);
        onSearchChange(v);
    };

    if (isMobile) {
        if (isSearchActive) {
            return (
                <>
                    <div
                        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30"
                        onClick={() => {
                            setIsSearchActive(false);
                            if (!local) onSearchChange("");
                        }}
                    />
                    <div className="fixed bottom-0 left-0 right-0 pb-safe z-40">
                        <div className="px-4 pb-4">
                            <div className="flex items-center gap-2 p-2 rounded-full mx-glass-strong">
                                <div className="flex-1 flex items-center gap-2 h-10 px-3">
                                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={local}
                                        onChange={(e) => handleChange(e.target.value)}
                                        placeholder="Search templates..."
                                        autoFocus
                                        style={{ fontSize: "16px" }}
                                        className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => local ? handleChange("") : setIsSearchActive(false)}
                                    className="h-10 w-10 flex-shrink-0 rounded-full mx-glass-subtle border-0"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            );
        }

        return (
            <div className="fixed bottom-0 left-0 right-0 pb-safe z-40">
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 p-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onFilterClick}
                            className="h-10 w-10 flex-shrink-0 mx-glass-pill relative border-0"
                        >
                            <SlidersHorizontal className="h-5 w-5" />
                            {showFilterBadge && (
                                <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
                            )}
                        </Button>

                        <button
                            onClick={() => setIsSearchActive(true)}
                            className="flex-1 flex items-center gap-2 h-10 px-3 rounded-full mx-glass-input transition-colors"
                        >
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground truncate">
                                {local || "Search templates..."}
                            </span>
                        </button>

                        <Button
                            size="icon"
                            onClick={onNewClick}
                            className="h-10 w-10 flex-shrink-0 rounded-full bg-primary hover:bg-primary/90"
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop search bar (top)
    return (
        <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 relative">
                <div className="flex items-center gap-3 px-3 py-2 rounded-full mx-glass hover:shadow-xl transition-shadow">
                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <input
                        type="text"
                        value={local}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder="Search templates..."
                        className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    {local && (
                        <button
                            onClick={() => handleChange("")}
                            className="p-1 hover:bg-muted/50 rounded-lg transition-colors flex-shrink-0"
                        >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>

            <Button
                variant="ghost"
                size="sm"
                onClick={onFilterClick}
                className="h-9 px-3 rounded-full mx-glass hover:shadow-xl relative border border-border/50"
            >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="ml-1.5">Filter</span>
                {showFilterBadge && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-primary rounded-full" />
                )}
            </Button>

            <Button
                size="sm"
                onClick={onNewClick}
                className="h-9 px-3 rounded-full bg-primary hover:bg-primary/90"
            >
                <Plus className="h-4 w-4" />
                <span className="ml-1">New</span>
            </Button>
        </div>
    );
}

export function UserContentTemplateManager() {
    const router = useRouter();
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [templates, setTemplates] = useState<ContentTemplateDB[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState<MessageRole | "all">("all");
    const [activeTab, setActiveTab] = useState<ActiveTab>("my");

    const [actionTarget, setActionTarget] = useState<ContentTemplateDB | null>(null);
    const [isActionOpen, setIsActionOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ContentTemplateDB | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Get user
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id);
        });
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchContentTemplates();
            setTemplates(data);
        } catch (err) {
            console.error("Error loading templates:", err);
            toast({ title: "Failed to load templates", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (currentUserId) loadData();
    }, [loadData, currentUserId]);

    const myTemplates = templates.filter((t) => t.user_id === currentUserId);
    const publicTemplates = templates.filter((t) => t.is_public && t.user_id !== currentUserId);

    const baseList = activeTab === "my" ? myTemplates : publicTemplates;

    const filteredTemplates = baseList.filter((t) => {
        const matchRole = selectedRole === "all" || t.role === selectedRole;
        const matchSearch =
            !searchTerm ||
            t.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchRole && matchSearch;
    });

    const canEdit = (t: ContentTemplateDB) => t.user_id === currentUserId;

    const handleNewTemplate = () => {
        startTransition(() => router.push("/settings/content-templates/new"));
    };

    const handleView = (t: ContentTemplateDB) => {
        startTransition(() => router.push(`/settings/content-templates/${t.id}`));
    };

    const handleEdit = (t: ContentTemplateDB) => {
        startTransition(() => router.push(`/settings/content-templates/${t.id}?mode=edit`));
    };

    const handleDuplicate = (t: ContentTemplateDB) => {
        startTransition(() => router.push(`/settings/content-templates/new?from=${t.id}`));
    };

    const handleCardClick = (t: ContentTemplateDB) => {
        setActionTarget(t);
        setIsActionOpen(true);
    };

    const handleDeleteRequest = (t: ContentTemplateDB) => {
        setDeleteTarget(t);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteTemplate(deleteTarget.id);
            clearTemplateCache();
            await loadData();
            toast({ title: "Template deleted" });
        } catch (err) {
            console.error("Error deleting template:", err);
            toast({ title: "Failed to delete template", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    const hasFilters = selectedRole !== "all";

    if (loading) {
        return (
            <div className="h-[calc(100dvh-var(--header-height))] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            <ContentTemplatesPageHeader />

            <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-textured">
                {/* Tabs row */}
                <div className="flex-shrink-0 flex items-center gap-1 px-3 pt-3 pb-0">
                    <button
                        onClick={() => setActiveTab("my")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            activeTab === "my"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                        Mine
                        <span className={`text-[10px] px-1.5 py-0 rounded-full ${activeTab === "my" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {myTemplates.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("public")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            activeTab === "public"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                        Public
                        <span className={`text-[10px] px-1.5 py-0 rounded-full ${activeTab === "public" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {publicTemplates.length}
                        </span>
                    </button>
                </div>

                {/* Desktop search */}
                {!isMobile && (
                    <div className="flex-shrink-0 px-4 pt-3">
                        <FloatingSearchBar
                            searchValue={searchTerm}
                            onSearchChange={setSearchTerm}
                            onFilterClick={() => setIsFilterOpen(true)}
                            onNewClick={handleNewTemplate}
                            showFilterBadge={hasFilters}
                        />
                    </div>
                )}

                {/* Template grid */}
                <div className="flex-1 overflow-y-auto px-3 pt-3 pb-24 md:pb-6">
                    {filteredTemplates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">
                                {searchTerm || hasFilters ? "No matching templates" : activeTab === "my" ? "No templates yet" : "No public templates"}
                            </p>
                            {!searchTerm && !hasFilters && activeTab === "my" && (
                                <Button
                                    size="sm"
                                    className="mt-4"
                                    onClick={handleNewTemplate}
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    New Template
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                            {filteredTemplates.map((t) => (
                                <TemplateCard
                                    key={t.id}
                                    template={t}
                                    onClick={handleCardClick}
                                    isDisabled={isPending}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Mobile floating action bar */}
                {isMobile && (
                    <FloatingSearchBar
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        onFilterClick={() => setIsFilterOpen(true)}
                        onNewClick={handleNewTemplate}
                        showFilterBadge={hasFilters}
                    />
                )}
            </div>

            {/* Action drawer/dialog */}
            <TemplateActionDrawer
                template={actionTarget}
                isOpen={isActionOpen}
                onClose={() => setIsActionOpen(false)}
                canEdit={actionTarget ? canEdit(actionTarget) : false}
                onView={handleView}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDeleteRequest}
            />

            {/* Filter sheet */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetContent side="right" className="w-[280px]">
                    <SheetHeader>
                        <SheetTitle className="text-sm">Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
                            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as MessageRole | "all")}>
                                <SelectTrigger className="text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MESSAGE_ROLES.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {hasFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                    setSelectedRole("all");
                                    setIsFilterOpen(false);
                                }}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete &ldquo;{deleteTarget?.label}&rdquo;? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
