import { useState, useEffect } from "react";
import { useLocalStorageManager } from "@/hooks/common/useLocalStorageManager";
import { MatrxRecordId } from "@/types";

// Constants for storage keys
const MODULE_NAME = "chat";
const FEATURE_NAME = "userInput";
const PROMPT_KEY = "lastPrompt";
const MODEL_KEY = "lastSelectedModel";

export function useChatStorage() {
    const localStorageManager = useLocalStorageManager();
    const [isInitialized, setIsInitialized] = useState(false);
    const [lastPrompt, setLastPrompt] = useState<string>("");
    const [selectedModelKey, setSelectedModelKey] = useState<MatrxRecordId | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize from storage on mount - using a simplified approach
    useEffect(() => {
        let isMounted = true;

        const loadFromStorage = async () => {
            try {
                // Get the last saved prompt
                const storedPrompt = await localStorageManager.getItem<string>(MODULE_NAME, FEATURE_NAME, PROMPT_KEY);

                // Get the last selected model
                const storedModelKey = await localStorageManager.getItem<MatrxRecordId>(MODULE_NAME, FEATURE_NAME, MODEL_KEY);

                // Only update state if component is still mounted
                if (isMounted) {
                    if (storedPrompt) {
                        setLastPrompt(storedPrompt);
                    }

                    if (storedModelKey) {
                        setSelectedModelKey(storedModelKey);
                    }

                    setIsInitialized(true);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Failed to load from storage:", error);
                if (isMounted) {
                    setIsInitialized(true);
                    setIsLoading(false);
                }
            }
        };

        loadFromStorage();

        // Cleanup function to prevent state updates after unmount
        return () => {
            isMounted = false;
        };
    }, []); // Empty dependency array - only run once on mount

    // Update prompt in storage - memoized to avoid dependency issues
    const updatePrompt = async (prompt: string) => {
        setLastPrompt(prompt);

        if (!prompt || prompt.trim() === "") {
            await clearPrompt();
            return;
        }

        try {
            await localStorageManager.setItem<string>(MODULE_NAME, FEATURE_NAME, PROMPT_KEY, prompt);
        } catch (error) {
            console.error("Failed to save prompt to storage:", error);
        }
    };

    // Clear prompt from storage
    const clearPrompt = async () => {
        setLastPrompt("");
        try {
            await localStorageManager.removeItem(MODULE_NAME, FEATURE_NAME, PROMPT_KEY);
        } catch (error) {
            console.error("Failed to clear prompt from storage:", error);
        }
    };

    // Update model selection in storage
    const updateModelSelection = async (modelKey: MatrxRecordId) => {
        if (!modelKey) return;

        setSelectedModelKey(modelKey);
        try {
            await localStorageManager.setItem<MatrxRecordId>(MODULE_NAME, FEATURE_NAME, MODEL_KEY, modelKey);
        } catch (error) {
            console.error("Failed to save model selection to storage:", error);
        }
    };

    return {
        lastPrompt,
        selectedModelKey,
        isLoading,
        isInitialized,
        updatePrompt,
        clearPrompt,
        updateModelSelection,
    };
}
