"use client";

import { useState, useTransition } from "react";
import { PromptCard } from "./PromptCard";
import { PromptSearchDialog } from "./PromptSearchDialog";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-service";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
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
    const [isPending, startTransition] = useTransition();
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [promptToDelete, setPromptToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

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

    if (prompts.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No prompts found. Create your first prompt to get started!</p>
            </div>
        );
    }

    return (
        <>
            {/* Search Button - Only show if there are prompts */}
            {prompts.length > 0 && (
                <div className="mb-6 flex justify-end">
                    <Button
                        onClick={() => setIsSearchOpen(true)}
                        variant="outline"
                        className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Search Prompts
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {prompts.map((prompt) => (
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

            <PromptSearchDialog
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                prompts={prompts}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 dark:text-red-400">
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
                            className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                        >
                            Delete Prompt
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}