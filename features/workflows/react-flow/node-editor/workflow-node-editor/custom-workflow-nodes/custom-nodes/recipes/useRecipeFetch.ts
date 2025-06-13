"use client";
import { useState, useEffect, useCallback } from "react";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";
import { getCompiledRecipeByVersionWithNeededBrokers, NeededBroker, RecipeConfig } from "@/features/workflows/service/recipe-service";

export function useRecipeFetch() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recipeDetails, setRecipeDetails] = useState<RecipeConfig | null>(null);
    const [neededBrokers, setNeededBrokers] = useState<NeededBroker[]>([]);
    
    // User-controlled state
    const [recipeId, setRecipeId] = useState<string>("");
    const [useLatestVersion, setUseLatestVersion] = useState(true);
    const [version, setVersion] = useState<number | undefined>(undefined);
    
    const { quickReferenceSelectOptions } = useFetchQuickRef("recipe");

    // Internal fetch function
    const fetchRecipeDetails = useCallback(async (id: string, ver?: number) => {
        if (!id) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const recipeDetails = await getCompiledRecipeByVersionWithNeededBrokers(id, ver);
            setRecipeDetails(recipeDetails);
            if (recipeDetails.neededBrokers) {
                setNeededBrokers(recipeDetails.neededBrokers);
            } else {
                setNeededBrokers([]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch recipe details";
            setError(errorMessage);
            setRecipeDetails(null);
            setNeededBrokers([]);
            console.error("Error fetching recipe details:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-fetch when dependencies change
    useEffect(() => {
        if (!recipeId) {
            setRecipeDetails(null);
            setNeededBrokers([]);
            setError(null);
            return;
        }

        const versionToUse = useLatestVersion ? undefined : version;
        fetchRecipeDetails(recipeId, versionToUse);
    }, [recipeId, useLatestVersion, version, fetchRecipeDetails]);

    // Clear version when switching to latest
    const handleUseLatestToggle = useCallback((useLatest: boolean) => {
        setUseLatestVersion(useLatest);
        if (useLatest) {
            setVersion(undefined);
        }
    }, []);

    return {
        // State
        loading,
        error,
        recipeDetails,
        neededBrokers,
        recipeId,
        useLatestVersion,
        version,
        quickReferenceSelectOptions,
        
        // Actions
        setRecipeId,
        setUseLatestVersion: handleUseLatestToggle,
        setVersion,
    };
}