"use client";

import { useState, useTransition } from "react";
import { RecipeCard } from "./RecipeCard";
import { RecipesFilter } from "./RecipesFilter";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-service";
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

interface Recipe {
    id: string;
    name: string;
    description?: string;
    tags?: any;
    status?: string;
}

interface RecipesGridProps {
    recipes: Recipe[];
}

export function RecipesGrid({ recipes }: RecipesGridProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<{ id: string; name: string } | null>(null);
    const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>(recipes);

    const handleDeleteClick = (id: string, name: string) => {
        setRecipeToDelete({ id, name });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!recipeToDelete) return;
        
        const { id } = recipeToDelete;
        setDeletingIds(prev => new Set(prev).add(id));
        
        try {
            const response = await fetch(`/api/recipes/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete recipe");
            }

            router.refresh();
            toast.success("Recipe deleted successfully!");
        } catch (error) {
            console.error("Error deleting recipe:", error);
            toast.error("Failed to delete recipe. Please try again.");
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        } finally {
            setDeleteDialogOpen(false);
            setRecipeToDelete(null);
        }
    };

    const handleDuplicate = async (id: string) => {
        setDuplicatingIds(prev => new Set(prev).add(id));
        
        try {
            const response = await fetch(`/api/recipes/${id}/duplicate`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to duplicate recipe");
            }

            router.refresh();
            toast.success("Recipe duplicated successfully!");
        } catch (error) {
            console.error("Error duplicating recipe:", error);
            toast.error("Failed to duplicate recipe. Please try again.");
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
        setRecipeToDelete(null);
    };

    const handleNavigate = (id: string, path: string) => {
        // Prevent navigation if already navigating
        if (navigatingId) return;
        
        setNavigatingId(id);
        startTransition(() => {
            router.push(path);
        });
    };

    if (recipes.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No recipes found. Create your first recipe to get started!</p>
            </div>
        );
    }

    return (
        <>
            {/* Search and Filter */}
            <RecipesFilter
                recipes={recipes}
                onFilteredRecipesChange={setFilteredRecipes}
            />

            {/* Recipes Grid */}
            {filteredRecipes.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                        No recipes match your filters. Try adjusting your search or filters.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredRecipes.map((recipe) => (
                    <RecipeCard
                        key={recipe.id}
                        id={recipe.id}
                        name={recipe.name}
                        description={recipe.description}
                        onDelete={(id) => {
                            const recipe = recipes.find(r => r.id === id);
                            if (recipe) {
                                handleDeleteClick(id, recipe.name);
                            }
                        }}
                        onDuplicate={handleDuplicate}
                        onNavigate={handleNavigate}
                        isDeleting={deletingIds.has(recipe.id)}
                        isDuplicating={duplicatingIds.has(recipe.id)}
                        isNavigating={navigatingId === recipe.id}
                        isAnyNavigating={navigatingId !== null}
                    />
                ))}
                </div>
            )}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 dark:text-red-400">
                            Delete Recipe
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{recipeToDelete?.name}"? 
                            This action cannot be undone and will permanently remove the recipe and all its compiled versions.
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
                            Delete Recipe
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

