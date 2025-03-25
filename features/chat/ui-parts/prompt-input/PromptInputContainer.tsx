"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import TextInput from "./TextInput";
import InputBottomControls from "./InputBottomControls";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";
import FileChipsWithPreview from "@/components/ui/file-preview/FileChipsWithPreview";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import { NewChatResult } from "@/hooks/ai/chat/new/useChat";
import { ChatResult } from "@/hooks/ai/chat/useChat";

interface PromptInputContainerProps {
    onMessageSent?: () => void;
    disabled?: boolean;
    chatHook: ChatResult | NewChatResult;
    localContent?: string;
    onContentChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    renderedBy?: string;
}

const PromptInputContainer: React.FC<PromptInputContainerProps> = ({
    onMessageSent,
    disabled = false,
    chatHook,
    localContent,
    onContentChange,
    renderedBy,
    }) => {
    const [isLocalSubmitting, setIsLocalSubmitting] = useState<boolean>(false);
    const textInputRef = useRef<HTMLTextAreaElement>(null); // Added ref

    const {
        fileManager,
        currentConversation,
        messageCrud,
        submitChatMessage,
        isSubmitting: isHookSubmitting,
    } = chatHook;
    const [content, setContent] = useState<string>("");

    useEffect(() => {
        if (localContent !== undefined) {
            setContent(localContent);
        } else if (messageCrud.message) {
            setContent(messageCrud.message.content);
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
                textInputRef.current?.focus(); // Added focus after successful submit
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
                    ref={textInputRef} // Added ref prop
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