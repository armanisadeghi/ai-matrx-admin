"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import TextInput from "./TextInput";
import InputBottomControls from "./InputBottomControls";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";
import FileChipsWithPreview from "@/components/ui/file-preview/FileChipsWithPreview";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { useFileManagement } from "@/hooks/ai/chat/useFileManagement";
import { useIsMobile } from "@/hooks/use-mobile";
  
interface PromptInputContainerProps {
    onMessageSent?: () => void;
    disabled?: boolean;
    localContent?: string;
    onContentChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit: () => Promise<boolean>;
}

const PromptInputContainer: React.FC<PromptInputContainerProps> = ({
    onMessageSent,
    disabled = false,
    localContent,
    onContentChange,
    onSubmit,
}) => {

    const [localDisabled, setLocalDisabled] = useState<boolean>(false);
    const isMobile = useIsMobile();

    useEffect(() => {
        setLocalDisabled(disabled);
    }, [disabled]);

    const dispatch = useAppDispatch();

    const textInputRef = useRef<HTMLTextAreaElement>(null);

    const { chatActions, chatSelectors, conversationId, messageId } = useChatBasics();


    const fileManager = useFileManagement({
        onFilesUpdate: (files) => chatActions.updateFiles({ value: files.map((file) => file.url) }),
    });


    const [content, setContent] = useState<string>("");

    const activeMessageRecord = useAppSelector(chatSelectors.activeMessage);

    useEffect(() => {
        if (activeMessageRecord?.content === "") {
            setContent("");
        } else if (localContent !== undefined) {
            setContent(localContent);
        } else if (activeMessageRecord?.content) {
            setContent(activeMessageRecord.content);
        }
    }, [activeMessageRecord?.content, localContent]);

    const handleContentChange = useCallback(
        (newContent: string) => {
            setContent(newContent);
            if (onContentChange) {
                const syntheticEvent = {
                    target: { value: newContent },
                    currentTarget: { value: newContent },
                } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
                onContentChange(syntheticEvent);
            }
        },
        [onContentChange, chatActions, dispatch]
    );

    const handleFileUpload = useCallback(
        async (results: { url: string; type: string; details?: EnhancedFileDetails }[]) => {
            await fileManager.addFiles(results);
        },
        [fileManager]
    );

    const handleTriggerSubmit = useCallback(async () => {
        if (!activeMessageRecord) {
            console.error("PromptInputContainer: handleTriggerSubmit: activeMessageRecord was not found");
            console.log("Message Id:", messageId);
            return;
        }
    
        // Don't submit if no content
        if (!content.trim() && fileManager.files.length === 0) {
            return;
        }
    
        // Store current content for potential rollback
        const previousContent = content;
        
        // Immediately clear the input (this will be rendered)
        setContent("");
        setLocalDisabled(true);
        
        // Update Redux store with the original content
        dispatch(chatActions.updateMessageContent({ value: previousContent }));
        
        try {
            // Attempt submission
            const success = await onSubmit();
            
            if (success) {
                // Input is already clear, just handle post-success actions
                fileManager.clearFiles();
                
                if (onMessageSent) {
                    onMessageSent();
                }
                textInputRef.current?.focus();
            } else {
                // Restore the previous content if submission failed
                setContent(previousContent);
                console.error("Failed to send message (handled by parent)");
            }
        } finally {
            setLocalDisabled(false);
        }
    }, [content, fileManager, onSubmit, onMessageSent, chatActions, dispatch, activeMessageRecord, messageId]);
    
    return (
        <div className="relative">
            <FileChipsWithPreview files={fileManager.files} onRemoveFile={fileManager.removeFile} />

            <div className="relative rounded-3xl">
                <TextInput
                    ref={textInputRef}
                    content={content}
                    disabled={localDisabled}
                    onContentChange={handleContentChange}
                    onSubmit={handleTriggerSubmit}
                    onImagePasted={(result) => {
                        fileManager.addFiles([result]);
                    }}
                    bucket="userContent"
                    path={`chat-attachments/conversation-${conversationId}`}
                />

                <div className="absolute bottom-0 left-0 right-0 rounded-3xl">
                    <InputBottomControls isDisabled={localDisabled} onSendMessage={handleTriggerSubmit} fileManager={fileManager} />
                </div>
            </div>

            {fileManager.showFileUpload && (
                <div className="absolute bottom-full mb-10 w-full bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-3xl">
                    <FileUploadWithStorage
                        bucket="userContent"
                        path={`chat-attachments/conversation-${conversationId}`}
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
