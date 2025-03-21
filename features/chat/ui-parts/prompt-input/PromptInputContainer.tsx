"use client";

import React, { useState, useCallback, useEffect } from "react";
import TextInput from "./TextInput";
import InputBottomControls from "./InputBottomControls";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";
import FileChipsWithPreview from "@/components/ui/file-preview/FileChipsWithPreview";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import { ChatResult } from "@/hooks/ai/chat/new/useChat";

interface PromptInputContainerProps {
    onMessageSent?: () => void;
    disabled?: boolean;
    chatHook: ChatResult;
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
    const [isLocalSubmitting, setIsLocalSubmitting] = useState<boolean>(false);

    const {
        fileManager,
        currentMessage,
        currentConversation,
        messageCrud,
        createNewMessage,
        submitChatMessage,
        isSubmitting: isHookSubmitting,
    } = chatHook;
    const [content, setContent] = useState<string>("");

    useEffect(() => {
        if (localContent !== undefined) {
            setContent(localContent);
        } else if (currentMessage) {
            setContent(currentMessage.content);
        }
    }, []);

    const handleContentChange = useCallback(
        (content: string) => {
            setContent(content);
            if (onContentChange) {
                const syntheticEvent = {
                    target: { value: content },
                    currentTarget: { value: content },
                } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
                onContentChange(syntheticEvent);
            }
        },
        [onContentChange]
    );

    const handleFileUpload = useCallback(
        async (results: { url: string; type: string; details?: EnhancedFileDetails }[]) => {
            await fileManager.addFiles(results);
        },
        [fileManager]
    );

    const handleSendMessage = useCallback(async () => {
        messageCrud.updateContent(content);

        if (!content.trim() && fileManager.files.length === 0) {
            return;
        }

        try {
            setIsLocalSubmitting(true);

            const success = await submitChatMessage();

            if (success) {
                if (onMessageSent) {
                    onMessageSent();
                }
                return true;
            } else {
                console.error("Failed to send message");
                return false;
            }
        } catch (error) {
            console.error("Error sending message:", error);
            return false;
        } finally {
            setIsLocalSubmitting(false);
            createNewMessage("", {}, true);
        }
    }, [content, fileManager.files.length, submitChatMessage, onMessageSent]);

    const isDisabled = disabled || isLocalSubmitting || isHookSubmitting;

    return (
        <div className="relative">
            {/* File Chips Component */}
            <FileChipsWithPreview files={fileManager.files} onRemoveFile={fileManager.removeFile} />

            {/* Text Input with Bottom Controls */}
            <div className="relative rounded-3xl">
                <TextInput
                    content={content}
                    disabled={isDisabled}
                    onContentChange={handleContentChange}
                    onSubmit={handleSendMessage}
                    onImagePasted={(result) => {
                        fileManager.addFiles([result]);
                    }}
                    bucket="userContent"
                    path={`chat-attachments/conversation-${currentConversation?.id}`}
                />

                {/* Bottom Controls Component */}
                <div className="absolute bottom-0 left-0 right-0 rounded-3xl">
                    <InputBottomControls
                        isDisabled={isDisabled}
                        isSubmitting={isLocalSubmitting || isHookSubmitting}
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
                        onUploadStatusChange={fileManager.handleUploadStatusChange}
                        multiple={true}
                    />
                </div>
            )}
        </div>
    );
};

export default PromptInputContainer;
