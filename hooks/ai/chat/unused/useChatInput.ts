import { useState, useEffect, useCallback, useRef } from "react";
import { MatrxRecordId } from "@/types/entityTypes";
import { useChatStorage } from "@/hooks/ai/chat/unused/useChatStorage";
import { ChatInputSettings } from "@/types/chat/chat.types";
// import { useConversationMessages } from "../useConversationMessages";


export function useChatInput({ initialModelKey, mainChatHook }: any) {
    // Get storage functionality
    const { lastPrompt, selectedModelKey, isLoading, updatePrompt, clearPrompt, updateModelSelection } = useChatStorage();
    const {conversationCrud, messageCrud} = mainChatHook;
    const {updateCurrentModel, updateCurrentMode} = conversationCrud;

    // Chat input state
    const [message, setMessage] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Input settings state
    const [settings, setSettings] = useState<ChatInputSettings>({
        modelKey: null,
        searchEnabled: false,
        toolsEnabled: false,
        uploadedFiles: [],
        mode: "general",
    });

    // Storage initialization
    const initialized = useRef(false);
    useEffect(() => {
        if (!initialized.current && !isLoading) {
            if (lastPrompt) setMessage(lastPrompt);

            // Set model from storage or props
            let modelToUse = selectedModelKey || initialModelKey || null;
            if (modelToUse) {
                setSettings((prev) => ({ ...prev, modelKey: modelToUse }));
                if (initialModelKey && !selectedModelKey) {
                    updateModelSelection(initialModelKey);
                }
            }

            initialized.current = true;
        }
    }, [lastPrompt, selectedModelKey, initialModelKey, isLoading, updateModelSelection]);

    // Handle message changes
    const updateMessage = useCallback(
        (newMessage: string) => {
            setMessage(newMessage);
            updatePrompt(newMessage);
        },
        [updatePrompt]
    );

    // Handle settings changes
    const updateSettings = useCallback(
        (updates: Partial<ChatInputSettings>) => {
            setSettings((prev) => {
                const newSettings = { ...prev, ...updates };
                if (updates.modelKey && updates.modelKey !== prev.modelKey) {
                    updateModelSelection(updates.modelKey);
                }
                return newSettings;
            });
        },
        [updateModelSelection]
    );

    // Create and submit message
    const submitMessage = useCallback(
        async (displayOrder: number, systemOrder: number) => {
            if (!message.trim() || isSubmitting) return false;

            setIsSubmitting(true);
            try {
                // Determine message type based on attachments
                const hasFiles = settings.uploadedFiles.length > 0;
                const type = hasFiles ? "mixed" : "text";

                // Create metadata from files
                const metadata = hasFiles
                    ? {
                          files: settings.uploadedFiles.map((file) => ({
                              name: file.name,
                              size: file.size,
                              type: file.type,
                          })),
                      }
                    : {};

                // Create the message using the messageHook
                const messageId = messageCrud.createMessage({
                    content: message,
                    displayOrder,
                    systemOrder,
                    type,
                    metadata,
                });

                if (!messageId) return false;

                // Clear input state after successful submission
                setMessage("");
                await clearPrompt();
                setSettings((prev) => ({ ...prev, uploadedFiles: [] }));

                return true;
            } catch (error) {
                console.error("Error creating message:", error);
                return false;
            } finally {
                setIsSubmitting(false);
            }
        },
        [message, isSubmitting, settings.uploadedFiles, messageCrud, clearPrompt]
    );

    return {
        message,
        settings,
        isSubmitting,
        updateMessage,
        updateSettings,
        submitMessage,
    };
}
