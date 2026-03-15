"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import TextInput from "./TextInput";
import InputBottomControls from "./InputBottomControls";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";
import FileChipsWithPreview from "@/components/ui/file-preview/FileChipsWithPreview";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useFileManagement } from "@/hooks/ai/chat/useFileManagement";
import { ResourceChips } from "@/features/prompts/components/resource-display/ResourceChips";
import type { Resource } from "@/features/prompts/types/resources";
import { formatResourcesToXml } from "@/features/prompts/utils/resource-formatting";

interface PromptInputContainerProps {
    onMessageSent?: () => void;
    disabled?: boolean;
    onContentChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit: () => Promise<boolean>;
}

const PromptInputContainer: React.FC<PromptInputContainerProps> = ({
    onMessageSent,
    disabled = false,
    onContentChange,
    onSubmit,
}) => {
    const [localDisabled, setLocalDisabled] = useState<boolean>(false);

    useEffect(() => {
        setLocalDisabled(disabled);
    }, [disabled]);

    const dispatch = useAppDispatch();
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textInputRef.current?.focus();
    }, []);

    const { chatActions, chatSelectors, conversationId, messageId } = useChatBasics();

    const fileManager = useFileManagement({
        onFilesUpdate: (files) => dispatch(chatActions.updateFiles({ value: files.map((file) => file.url) })),
    });

    const [content, setContent] = useState<string>("");

    // Non-file resources (notes, tasks, tables, webpage, youtube, url types).
    // These are formatted as XML and appended to the message content on submit.
    const [resources, setResources] = useState<Resource[]>([]);

    const activeMessageRecord = useAppSelector(chatSelectors.activeMessage);

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
        [onContentChange]
    );

    const handleAddSpecialContent = useCallback((contentToAdd: string) => {
        setContent((prev) => (prev.trim() === "" ? contentToAdd : `${prev}\n\n${contentToAdd}`));
    }, []);

    // Called by ResourcePickerMenu when a resource is selected.
    const handleResourceSelected = useCallback(
        (resource: Resource) => {
            const isFileType = resource.type === "file" || resource.type === "storage" || resource.type === "audio";

            if (isFileType && (resource.data as { url?: string }).url) {
                // File types go through the existing file manager → Redux
                const fileData = resource.data as { url: string; type?: string; details?: EnhancedFileDetails };
                fileManager.addFiles([{ url: fileData.url, type: fileData.type ?? "file", details: fileData.details }]);
            } else {
                // All other resource types are kept in local state and formatted on submit
                setResources((prev) => [...prev, resource]);
            }
        },
        [fileManager]
    );

    const handleRemoveResource = useCallback((index: number) => {
        setResources((prev) => prev.filter((_, i) => i !== index));
    }, []);

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

        const hasFileAttachments = fileManager.files.length > 0;
        const hasResources = resources.length > 0;

        if (!content.trim() && !hasFileAttachments && !hasResources) {
            return;
        }

        // Append non-file resources as XML before dispatching
        let finalContent = content;
        if (hasResources) {
            const xml = formatResourcesToXml(resources);
            if (xml) {
                finalContent = finalContent.trim() ? `${finalContent}\n\n${xml}` : xml;
            }
        }

        dispatch(chatActions.updateMessageContent({ value: finalContent }));
        dispatch(chatActions.updateMessageStatus({ status: "submitted" }));
        setContent("");

        try {
            const success = await onSubmit();

            if (success) {
                fileManager.clearFiles();
                setResources([]);

                if (onMessageSent) {
                    onMessageSent();
                }
                textInputRef.current?.focus();
            } else {
                setContent(activeMessageRecord.content);
                console.error("Failed to send message (handled by parent)");
            }
        } finally {
            setLocalDisabled(false);
        }
    }, [content, fileManager, resources, onSubmit, onMessageSent, chatActions, dispatch, activeMessageRecord, messageId]);

    return (
        <div className="relative">
            <FileChipsWithPreview files={fileManager.files} onRemoveFile={fileManager.removeFile} />
            {resources.length > 0 && (
                <ResourceChips resources={resources} onRemove={handleRemoveResource} />
            )}

            <div className="relative rounded-2xl border border-border">
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

                <div className="absolute bottom-0 left-0 right-0 rounded-2xl">
                    <InputBottomControls
                        isDisabled={localDisabled}
                        onSendMessage={handleTriggerSubmit}
                        fileManager={fileManager}
                        onAddSpecialContent={handleAddSpecialContent}
                        onResourceSelected={handleResourceSelected}
                    />
                </div>
            </div>

            {fileManager.showFileUpload && (
                <div className="absolute bottom-full mb-10 w-full bg-muted border border-border rounded-2xl">
                    <FileUploadWithStorage
                        bucket="userContent"
                        path={`chat-attachments/conversation-${conversationId}`}
                        onUploadComplete={handleFileUpload}
                        onUploadStatusChange={fileManager.handleUploadStatusChange}
                        multiple={true}
                        useMiniUploader={false}
                    />
                </div>
            )}
        </div>
    );
};

export default PromptInputContainer;
