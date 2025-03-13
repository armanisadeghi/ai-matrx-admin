import React, { useState, useCallback } from "react";
import { ConversationWithRoutingResult } from "@/hooks/ai/chat/useConversationWithRouting";
import { useFileManagement } from "./useFileManagement";
import TextInput from "./TextInput";
import InputBottomControls from "./InputBottomControls";
import FileChips from "./FileChips";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";

interface PromptInputContainerProps {
    onMessageSent?: () => void;
    disabled?: boolean;
    chatHook: ConversationWithRoutingResult;
    localContent?: string;
    onContentChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const PromptInputContainer: React.FC<PromptInputContainerProps> = ({
    onMessageSent,
    disabled = false,
    chatHook,
    localContent,
    onContentChange,
}) => {

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const { currentMessage, currentConversation, isCreatingNewConversation, messageCrud, saveMessage, saveNewConversationAndNavigate } =
        chatHook;

    const fileManager = useFileManagement(chatHook);


    const messageContent = localContent !== undefined ? localContent : currentMessage?.content || "";


    const handleContentChange = useCallback(
        (content: string) => {
            if (onContentChange) {

                const syntheticEvent = {
                    target: { value: content },
                    currentTarget: { value: content },
                } as unknown as React.ChangeEvent<HTMLTextAreaElement>;

                onContentChange(syntheticEvent);
            } else {

                messageCrud.updateContent(content);
            }
        },
        [messageCrud, onContentChange]
    );


    const handleFileUpload = useCallback(async (results: { url: string; type: string }[]) => {
        await fileManager.addFiles(results);
    }, [fileManager]);


    const handleSendMessage = useCallback(async () => {

        if (!messageContent.trim() && fileManager.files.length === 0) {
            return;
        }

        try {
            setIsSubmitting(true);

            // Save the message/conversation
            let result: any;

            if (isCreatingNewConversation) {
                // The integrated hook handles saving and navigation in one step
                result = await saveNewConversationAndNavigate();
            } else {
                result = await saveMessage();
            }

            if (result.success) {
                // Call the parent callback if provided
                if (onMessageSent) {
                    onMessageSent();
                }

                return true;
            } else {
                console.error("Failed to send message:", result.error);
                return false;
            }
        } catch (error) {
            console.error("Error sending message:", error);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [messageContent, fileManager, messageCrud, isCreatingNewConversation, saveNewConversationAndNavigate, saveMessage, onMessageSent]);

    const isDisabled = disabled || isSubmitting;

    return (
        <div className="relative">
            {/* File Chips Component */}
            <FileChips files={fileManager.files} onRemoveFile={fileManager.removeFile} />

            {/* Text Input with Bottom Controls */}
            <div className="relative">
                <TextInput
                    content={messageContent}
                    disabled={isDisabled}
                    onContentChange={handleContentChange}
                    onSubmit={handleSendMessage}
                />

                {/* Bottom Controls Component */}
                <div className="absolute bottom-0 left-0 right-0">
                    <InputBottomControls
                        isDisabled={isDisabled}
                        isSubmitting={isSubmitting}
                        fileManager={fileManager}
                        onSendMessage={handleSendMessage}
                        chatHook={chatHook}
                    />
                </div>
            </div>

            {/* File Upload Area */}
            {fileManager.showFileUpload && (
                <div className="absolute bottom-full mb-10 w-full bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-3xl">
                    <FileUploadWithStorage
                        bucket="userContent"
                        path={`chat-attachments/conversation-${currentConversation?.id}`}
                        onUploadComplete={handleFileUpload}
                        multiple={true}
                    />
                </div>
            )}
        </div>
    );
};

export default PromptInputContainer;
