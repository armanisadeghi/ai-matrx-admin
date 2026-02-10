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
        [onContentChange, chatActions, dispatch]
    );


    const handleAddSpecialContent = useCallback((contentToAdd: string) => {
        if (content.trim() === "") {
            setContent(contentToAdd);
        } else {
            setContent(content + "\n\n" + contentToAdd);
        }
    }, [content]);


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

        if (!content.trim() && fileManager.files.length === 0) {
            return;
        }

        dispatch(chatActions.updateMessageContent({ value: content }));
        dispatch(chatActions.updateMessageStatus({ status: "submitted" }));
        setContent("");

        try {
            const success = await onSubmit();

            if (success) {
                fileManager.clearFiles();

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
    }, [content, fileManager, onSubmit, onMessageSent, chatActions, dispatch, activeMessageRecord, messageId]);

    return (
        <div className="relative">
            <FileChipsWithPreview files={fileManager.files} onRemoveFile={fileManager.removeFile} />

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
                    <InputBottomControls isDisabled={localDisabled} onSendMessage={handleTriggerSubmit} fileManager={fileManager} onAddSpecialContent={handleAddSpecialContent} />
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
