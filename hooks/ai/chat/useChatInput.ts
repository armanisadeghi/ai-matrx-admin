import { useState, useEffect, useCallback, useRef } from "react";
import { MatrxRecordId } from "@/types";
import { useChatStorage } from "@/hooks/ai/chat/useChatStorage";

// Types for chat input settings
export interface ChatInputSettings {
    modelKey: MatrxRecordId | null;
    searchEnabled: boolean;
    toolsEnabled: boolean;
    uploadedFiles: File[];
    mode: "general" | "research" | "brainstorm" | "analyze" | "images" | "code";
    // Future settings will be added here
}

export function useChatInput(initialModelKey?: MatrxRecordId) {
    // Get storage functionality
    const { lastPrompt, selectedModelKey, isLoading, updatePrompt, clearPrompt, updateModelSelection } = useChatStorage();

    // Chat input state
    const [message, setMessage] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [conversationId, setConversationId] = useState<string | null>(null);

    // Use ref to track whether we've initialized from storage
    const initialized = useRef(false);

    // Input settings state
    const [settings, setSettings] = useState<ChatInputSettings>({
        modelKey: null, // Start with null, we'll set this after initialization
        searchEnabled: false,
        toolsEnabled: false,
        uploadedFiles: [],
        mode: "general",
    });

    // Initialize message from storage - only once
    useEffect(() => {
        if (lastPrompt && !initialized.current) {
            setMessage(lastPrompt);
        }
    }, [lastPrompt]);

    // Initialize model from storage or props - only once when data is available
    useEffect(() => {
        // Only run this effect if we haven't initialized and we have the necessary data
        if (!initialized.current && !isLoading) {
            let modelToUse: MatrxRecordId | null = null;

            // First priority: use model from storage
            if (selectedModelKey) {
                modelToUse = selectedModelKey;
            }
            // Second priority: use initial model from props
            else if (initialModelKey) {
                modelToUse = initialModelKey;
                // Also save this to storage
                updateModelSelection(initialModelKey);
            }

            // Update settings with the selected model
            if (modelToUse) {
                setSettings((prev) => ({ ...prev, modelKey: modelToUse }));
            }

            // Mark as initialized to prevent further updates
            initialized.current = true;
        }
    }, [selectedModelKey, initialModelKey, isLoading, updateModelSelection]);

    // Handle message changes
    const updateMessage = useCallback(
        (newMessage: string) => {
            setMessage(newMessage);
            updatePrompt(newMessage);
        },
        [updatePrompt]
    );

    // Handle settings changes - avoiding dependency on updateModelSelection
    const updateSettings = useCallback((updates: Partial<ChatInputSettings>) => {
        setSettings((prev) => {
            const newSettings = { ...prev, ...updates };

            // If model has changed, update in storage
            if (updates.modelKey && updates.modelKey !== prev.modelKey) {
                // Call directly, don't add as dependency
                updateModelSelection(updates.modelKey);
            }

            return newSettings;
        });
    }, []); // No dependencies to avoid cycles

    // Create a new conversation
    const createConversation = useCallback((id: string) => {
        setConversationId(id);
    }, []);

    // Build the submission payload
    const buildSubmissionPayload = useCallback(() => {
        return {
            conversationId: conversationId || "new",
            message,
            modelKey: settings.modelKey,
            searchEnabled: settings.searchEnabled,
            toolsEnabled: settings.toolsEnabled,
            files: settings.uploadedFiles,
            mode: settings.mode,
        };
    }, [conversationId, message, settings]);

    // Handle message submission
    const submitMessage = useCallback(
        async (onSubmit: (payload: any) => Promise<void>) => {
            if (!message || message.trim() === "" || isSubmitting) {
                return false;
            }

            setIsSubmitting(true);

            try {
                // Build payload
                const payload = buildSubmissionPayload();

                // Submit via provided callback
                await onSubmit(payload);

                // Clear message and storage after successful submission
                setMessage("");
                await clearPrompt();

                return true;
            } catch (error) {
                console.error("Error submitting message:", error);
                return false;
            } finally {
                setIsSubmitting(false);
            }
        },
        [message, isSubmitting, buildSubmissionPayload, clearPrompt]
    );

    // Reset all input state
    const resetInput = useCallback(async () => {
        setMessage("");
        await clearPrompt();
        setSettings({
            modelKey: initialModelKey || null,
            searchEnabled: false,
            toolsEnabled: false,
            uploadedFiles: [],
            mode: "general",
        });
    }, [clearPrompt, initialModelKey]);

    return {
        // State
        message,
        settings,
        isSubmitting,
        isLoading,
        conversationId,

        // Actions
        updateMessage,
        updateSettings,
        submitMessage,
        resetInput,
        createConversation,

        // Helpers
        buildSubmissionPayload,
    };
}
