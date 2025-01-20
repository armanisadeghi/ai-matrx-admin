import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';
import { EditorState, useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { EditorWithProviders } from '@/features/rich-text-editor/provider/withManagedEditor';
import { Card } from '@/components/ui';
import { MatrxRecordId } from '@/types';
import MessageToolbar from './MessageToolbar';
import { ProcessedRecipeMessages } from './types';
import { AddBrokerPayload, useAddBroker } from '../hooks/brokers/useAddBroker';
import { isEqual } from 'lodash';
import { useEditorChips } from '@/features/rich-text-editor/hooks/useEditorChips';
import { v4 } from 'uuid';
import DebugPanel from './AdminToolbar';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';
import useChipHandlers from '../hooks/useChipHandlers';

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
    deleteMessage?: (messageRecordId: MatrxRecordId) => void;
    onOrderChange?: (draggedId: MatrxRecordId, dropTargetId: MatrxRecordId) => void;
}

export const ManagedMessageEditor: React.FC<MessageEditorProps> = ({
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
    const { addBroker } = useAddBroker(messageRecordId);

    const { updateBrokerConnection, updateChip } = useEditorChips(messageRecordId);

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedContent, setLastSavedContent] = useState('');
    const [isEditorHidden, setIsEditorHidden] = useState(isCollapsed);
    const [debugVisible, setDebugVisible] = useState(false);
    const [lastEditorState, setLastEditorState] = useState<EditorState>(() => context.getEditorState(messageRecordId));

    const { actions: messageActions, selectors: messageSelectors } = useEntityTools('messageTemplate');

    const { handleChipClick, handleChipDoubleClick, handleChipMouseEnter, handleChipMouseLeave, handleChipContextMenu } = useChipHandlers(messageRecordId);

    useEffect(() => {
        setIsEditorHidden(isCollapsed);
    }, [isCollapsed]);

    useEffect(() => {
        if (message?.content) {
            setLastSavedContent(message.content);
        }
    }, [message?.content]);

    useEffect(() => {
        if (!context.isEditorRegistered(messageRecordId)) return;

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
    }, [context, messageRecordId, lastEditorState, onMessageUpdate]);

    const createNewBroker = useCallback(
        (chipData: ChipData) => {
            const addBrokerPayload: AddBrokerPayload = {
                id: v4(),
                name: chipData.label || 'New Broker',
                defaultValue: chipData.stringValue || '',
                dataType: 'str' as const,
            };

            console.log('==>> createNewBroker with Chip Data:', chipData);
            console.log('createNewBroker', addBrokerPayload);

            addBroker(addBrokerPayload);
            context.syncChipToBroker(chipData.id, `id:${addBrokerPayload.id}`);
            // updateBrokerConnection(chipData.id, `id:${addBrokerPayload.id}`);
        },
        [addBroker, context.syncChipToBroker]
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

    const handleSave = useCallback(() => {
        if (isSaving) return;

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

    const handleBlur = useCallback(() => {
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
            {debugVisible && <DebugPanel editorId={messageRecordId} message={message}/>}
            <div className={`transition-all duration-200 ${isEditorHidden ? 'h-0 overflow-hidden' : 'h-[calc(100%-2rem)]'}`}>
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
            </div>
        </Card>
    );
};

ManagedMessageEditor.displayName = 'ManagedMessageEditor';

export default ManagedMessageEditor;
