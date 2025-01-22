import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { EditorWithProviders } from '@/features/rich-text-editor/provider/withManagedEditor';
import { Card } from '@/components/ui';
import { MatrxRecordId } from '@/types';
import MessageToolbar from './MessageToolbar';
import { ProcessedRecipeMessages } from './types';
import { isEqual } from 'lodash';
import { v4 } from 'uuid';
import DebugPanel from './AdminToolbar';
import { ChipData, EditorState } from '@/features/rich-text-editor/types/editor.types';
import useChipHandlers from '../hooks/useChipHandlers';
import { useRelatedDataBrokers } from '../hooks/useMessageBrokers';
import { TextPlaceholderEffect } from './TextPlaceholderEffect';
import { m } from 'framer-motion';

const DEBUG_STATUS = true;

interface MessageData {
    id: string;
    content: string;
    processedContent: string;
    chips: ChipData[];
}

interface ChipChangeData {
    chipId: string;
    brokerId?: string;
    action: 'add' | 'update' | 'remove';
    data: Partial<ChipData>;
}

interface MessageEditorProps {
    messageRecordId: MatrxRecordId;
    message: ProcessedRecipeMessages;
    isCollapsed: boolean;
    className?: string;
    onCollapse?: () => void;
    onExpand?: () => void;
    onDelete?: (messageRecordId: MatrxRecordId) => void;
    onMessageUpdate?: (messageData: MessageData) => void;
    onChipUpdate?: (chipData: ChipChangeData) => void;
    onToggleEditor?: (messageRecordId: MatrxRecordId) => void;
    onDragDrop?: (draggedId: MatrxRecordId, targetId: MatrxRecordId) => void;
    deleteMessage?: (childRecordId: MatrxRecordId) => void;
    onOrderChange?: (draggedId: MatrxRecordId, dropTargetId: MatrxRecordId) => void;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
    messageRecordId,
    message,
    className,
    isCollapsed = false,
    onCollapse,
    onExpand,
    onDelete,
    onMessageUpdate,
    onChipUpdate,
    onToggleEditor,
    onDragDrop,
    onOrderChange,
    deleteMessage,
    ...props
}) => {
    const dispatch = useAppDispatch();
    const context = useEditorContext();
    const { updateRecord } = useUpdateRecord('messageTemplate');
    // const { addBroker } = useAddBroker(messageRecordId);
    const [initialRenderHold, setInitialRenderHold] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedContent, setLastSavedContent] = useState('');
    const [isEditorHidden, setIsEditorHidden] = useState(isCollapsed);
    const [debugVisible, setDebugVisible] = useState(false);
    const [lastEditorState, setLastEditorState] = useState<EditorState>(() => context.getEditorState(messageRecordId));
    const { actions: messageActions } = useEntityTools('messageTemplate');
    const { handleChipClick, handleChipDoubleClick, handleChipMouseEnter, handleChipMouseLeave, handleChipContextMenu } = useChipHandlers(messageRecordId);

    const {
        messageBrokers,
        messageBrokerMatrxIds,
        dataBrokerIds,
        dataBrokerMatrxIds,
        coreDataBrokers,
        processedDataBrokers,
        messagePkId,
        messageMatrxId,
        deleteDataBroker,
        addBroker,
        messageBrokerIsLoading,
        messageBrokerLoadingState,
    } = useRelatedDataBrokers(messageRecordId);

    useEffect(() => {
        console.log('============ only logs during a render');
    }, []);

    useEffect(() => {
        if (messageBrokerIsLoading) {
            setInitialRenderHold(true);
        }
    }, []);

    useEffect(() => {
        if (!messageBrokerIsLoading && initialRenderHold) {
            setInitialRenderHold(false);
        }
    }, [messageBrokerIsLoading, initialRenderHold]);

    useEffect(() => {
        setIsEditorHidden(isCollapsed);
    }, [isCollapsed]);

    useEffect(() => {
        if (message?.content) {
            setLastSavedContent(message.content);
        }
    }, [message?.content]);

    useEffect(() => {
        if (!context.registry.isEditorRegistered(messageRecordId)) return;

        const interval = setInterval(() => {
            const currentState = context.getEditorState(messageRecordId);
            const processedContent = context.getTextWithChipsReplaced(messageRecordId, true);
            const rawContent = context.getTextWithChipsReplaced(messageRecordId, false);

            if (!isEqual(currentState, lastEditorState)) {
                const messageData: MessageData = {
                    id: messageRecordId,
                    content: rawContent,
                    processedContent,
                    chips: currentState.chipData,
                };

                onMessageUpdate?.(messageData);
                setLastEditorState(currentState);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [messageRecordId, lastEditorState, onMessageUpdate]);

    const updateMessageContent = useCallback(
        (content: string) => {
            dispatch(
                messageActions.updateUnsavedField({
                    recordId: messageRecordId,
                    field: 'content',
                    value: content,
                })
            );
        },
        [messageActions, dispatch, messageRecordId]
    );

    const handleSaveWithMetadata = useCallback(() => {
        if (isSaving || initialRenderHold || messageBrokerIsLoading) {
            return;
        }
    
        setIsSaving(true);
        
        context.contentService.saveContent(messageRecordId, context.getEditorState(messageRecordId))
            .then(savedContent => {
                setLastSavedContent(savedContent);
                updateRecord(messageRecordId);
            })
            .finally(() => {
                setTimeout(() => {
                    setIsSaving(false);
                }, 500);
            });
            
    }, [context, messageRecordId, updateRecord, isSaving]);


    const handleSave = useCallback(() => {
        console.log('Saving message:', messageRecordId);
        if (isSaving || initialRenderHold || messageBrokerIsLoading) {
            console.log('Skipping save:', isSaving, initialRenderHold, messageBrokerIsLoading);
            return;
        }
        

        const processedContent = context.getTextWithChipsReplaced(messageRecordId, true);
        // Skip if content hasn't changed
        if (processedContent === lastSavedContent) {
            return;
        }

        setIsSaving(true);
        updateMessageContent(processedContent);
        updateRecord(messageRecordId);
        setLastSavedContent(processedContent);

        setTimeout(() => {
            setIsSaving(false);
        }, 500);
    }, [context, messageRecordId, updateMessageContent, updateRecord, isSaving, lastSavedContent]);

    const createNewBroker = useCallback(
        async (chipData: ChipData) => {
            try {
                const newBrokerId = v4();
                console.log('Creating new broker:', newBrokerId, chipData);
                await addBroker(newBrokerId, chipData);
                console.log('Successfully created relationship');
                await context.chips.syncChipToBroker(chipData.id, `id:${newBrokerId}`);
                handleSave();
            } catch (error) {
                console.error('Failed to create relationship:', error);
            }
        },
        [addBroker, handleSave]
    );

    const addExistingBrokerToSelection = useCallback(
        (brokerId: string) => {
            console.log('Adding broker to selection:', brokerId);
        },
        [messageRecordId]
    );

    const associateBrokerWithMessage = useCallback(
        (brokerId: string) => {
            console.log('Associating broker with message:', brokerId);
        },
        [messageRecordId]
    );

    const handleBlur = useCallback(() => {
        console.log('blur event', messageRecordId);
        handleSave();
    }, [handleSave]);

    const handleDelete = useCallback(() => {
        console.log('Deleting message:', messageRecordId);
        deleteMessage(messageRecordId);
    }, [messageRecordId, onDelete]);

    const handleAddMedia = useCallback(() => {
        // Implementation for adding media
        console.log('Adding media');
    }, []);

    const handleLinkBroker = useCallback(() => {
        // Implementation for linking broker
        console.log('Linking broker');
    }, []);

    const handleShowProcessed = useCallback(() => {
        console.log('This will show the ugly processed content which replaces chips with the formula for the chip');
    }, []);

    const handleShowNormalContent = useCallback(() => {
        console.log('This will show the default Editor content, which has text, styling and chips.');
    }, []);

    const handleReplaceChipsWithBrokerContent = useCallback(() => {
        console.log(
            'This will replace chips and fetch the content value of each chip from the database and show the content for that broker in place of the chip'
        );
    }, []);

    const handleToggleVisibility = useCallback(() => {
        setIsEditorHidden((prev) => !prev);
        if (onToggleEditor) {
            onToggleEditor(messageRecordId);
        }
    }, [messageRecordId, onToggleEditor]);

    const handleRoleChange = useCallback(
        (messageRecordId: MatrxRecordId, newRole: 'user' | 'assistant' | 'system') => {
            dispatch(
                messageActions.updateUnsavedField({
                    recordId: messageRecordId,
                    field: 'role',
                    value: newRole,
                })
            );
            updateRecord(messageRecordId);
        },
        [dispatch]
    );

    const toggleDebug = useCallback(() => {
        setDebugVisible((prev) => !prev);
    }, []);

    return (
        <Card className='h-full p-0 overflow-hidden bg-background border-elevation2'>
            <MessageToolbar
                messageRecordId={messageRecordId}
                role={message.role}
                isCollapsed={isCollapsed}
                onAddMedia={handleAddMedia}
                onLinkBroker={handleLinkBroker}
                onDelete={handleDelete}
                onSave={handleSave}
                onToggleCollapse={handleToggleVisibility}
                onProcessed={handleShowProcessed}
                onTextWithChips={handleShowNormalContent}
                onShowBrokerContent={handleReplaceChipsWithBrokerContent}
                onRoleChange={handleRoleChange}
                onDragDrop={onDragDrop}
                debug={DEBUG_STATUS}
                onDebugClick={toggleDebug}
            />
            {debugVisible && (
                <DebugPanel
                    editorId={messageRecordId}
                    message={message}
                />
            )}
            <div className={`transition-all duration-200 ${isEditorHidden ? 'h-0 overflow-hidden' : 'h-[calc(100%-2rem)]'}`}>
                {initialRenderHold ? (
                    <div className='flex items-center justify-center h-full'>
                        <TextPlaceholderEffect />
                    </div>
                ) : (
                    <EditorWithProviders
                        id={messageRecordId}
                        initialContent={message.content}
                        className={className}
                        onBlur={handleBlur}
                        chipHandlers={{
                            onClick: handleChipClick,
                            onDoubleClick: handleChipDoubleClick,
                            onMouseEnter: handleChipMouseEnter,
                            onMouseLeave: handleChipMouseLeave,
                            onContextMenu: handleChipContextMenu,
                            onNewChip: createNewBroker,
                        }}
                        {...props}
                    />
                )}
            </div>
        </Card>
    );
};

MessageEditor.displayName = 'MessageEditor';

export default MessageEditor;
