import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { EditorWithProviders } from '@/features/rich-text-editor/provider/withManagedEditor';
import { Card } from '@/components/ui';
import { DataBrokerData, MatrxRecordId } from '@/types';
import MessageToolbar from './MessageToolbar';
import { ProcessedRecipeMessages } from './types';
import { UseRecipeMessagesHook } from '../hooks/dev/useMessageWithNew';
import { useChipMonitor } from '../hooks/useChipMonitor';
import { useAddBroker } from '../hooks/messages/useAddBroker';
import { ChipMenuProvider, useChipMenu } from '@/features/rich-text-editor/components/ChipContextMenu';

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
    matrxRecordId: MatrxRecordId;
    isCollapsed: boolean;
    className?: string;
    onCollapse?: () => void;
    onExpand?: () => void;
    onDelete?: (matrxRecordId: MatrxRecordId) => void;
    onMessageUpdate?: (messageData: MessageData) => void;
    onChipUpdate?: (chipData: ChipChangeData) => void;
    onToggleEditor?: (matrxRecordId: MatrxRecordId) => void;
    deleteMessageById?: (matrxRecordId: MatrxRecordId) => void;
    onOrderChange?: (draggedId: MatrxRecordId, dropTargetId: MatrxRecordId) => void;
    recipeMessageHook?: UseRecipeMessagesHook;
}

interface ChipData {
    id: string;
    label: string;
    color?: string;
    stringValue?: string;
    brokerId?: MatrxRecordId;
}

export const ManagedMessageEditor: React.FC<MessageEditorProps> = ({
    matrxRecordId,
    className,
    isCollapsed,
    onCollapse,
    onExpand,
    onDelete,
    onMessageUpdate,
    onChipUpdate,
    onToggleEditor,
    onOrderChange,
    recipeMessageHook,
    ...props
}) => {
    const dispatch = useAppDispatch();
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedContent, setLastSavedContent] = useState('');
    const { actions: messageActions, selectors: messsageSelectors } = useEntityTools('messageTemplate');
    const { actions: brokerActions, selectors: brokerSelectors, store } = useEntityTools('dataBroker');
    const { messages, deleteMessageById } = recipeMessageHook;
    const [showDialog, setShowDialog] = useState(false);
    const { showMenu } = useChipMenu();

    const { addBroker } = useAddBroker(matrxRecordId);

    const createNewBroker = useCallback((chipData: ChipData) => {
        const addBrokerPayload = {
            name: chipData.label,
            defaultValue: chipData.stringValue || '',
            dataType: 'str' as DataBrokerData['dataType'],

        }
        addBroker(addBrokerPayload);

    }, [matrxRecordId]);

    const addExistingBrokerToSelection = useCallback(
        (brokerId: string) => {
            console.log('Adding broker to selection:', brokerId);
        },
        [matrxRecordId]
    );

    const associateBrokerWithMessage = useCallback(
        (brokerId: string) => {
            console.log('Associating broker with message:', brokerId);
        },
        [matrxRecordId]
    );

    const chipMonitor = useChipMonitor({
        editorId: matrxRecordId,
        onChange: (changes) => {
            changes.forEach((change) => {
                switch (change.type) {
                    case 'added':
                        console.log('New chip added:', change.chip);
                        // Trigger your broker logic here if needed
                        if (!change.chip.brokerId) {
                            console.log('Chip needs broker:', change.chip);
                        }
                        break;

                    case 'updated':
                        console.log('Chip updated:', {
                            from: change.previousChip,
                            to: change.chip,
                        });
                        break;

                    case 'removed':
                        console.log('Chip removed:', change.chip);
                        break;
                }

                // Call your existing onChipUpdate if provided
                if (onChipUpdate) {
                    onChipUpdate({
                        chipId: change.chip.id,
                        brokerId: change.chip.brokerId,
                        action: change.type === 'added' ? 'add' : change.type === 'updated' ? 'update' : 'remove',
                        data: change.chip,
                    });
                }
            });
        },
    });

    const record = React.useMemo(
        () => messages.find((message) => message.matrxRecordId === matrxRecordId),
        [messages, matrxRecordId]
    ) as ProcessedRecipeMessages;

    const context = useEditorContext();
    const [isEditorHidden, setIsEditorHidden] = useState(isCollapsed);
    const [lastEditorState, setLastEditorState] = useState<string>('');
    const [lastChipState, setLastChipState] = useState<string>('');
    const { updateRecord } = useUpdateRecord('messageTemplate');

    const updateMessageContent = useCallback(
        (content: string) => {
            dispatch(
                messageActions.updateUnsavedField({
                    recordId: matrxRecordId,
                    field: 'content',
                    value: content,
                })
            );
        },
        [messageActions, dispatch, matrxRecordId]
    );

    useEffect(() => {
        setIsEditorHidden(isCollapsed);
    }, [isCollapsed]);

    const handleSave = useCallback(() => {
        if (isSaving) return;

        const processedContent = context.getTextWithChipsReplaced(matrxRecordId, true);
        // Skip if content hasn't changed
        if (processedContent === lastSavedContent) {
            return;
        }

        setIsSaving(true);
        updateMessageContent(processedContent);
        updateRecord(matrxRecordId);
        setLastSavedContent(processedContent);

        setTimeout(() => {
            setIsSaving(false);
        }, 500);
    }, [context, matrxRecordId, updateMessageContent, updateRecord, isSaving, lastSavedContent]);

    // Initialize lastSavedContent when the record loads
    useEffect(() => {
        if (record?.content) {
            setLastSavedContent(record.content);
        }
    }, [record?.content]);

    const handleBlur = useCallback(() => {
        // handleSave();
    }, [handleSave]);

    const handleDelete = useCallback(() => {
        deleteMessageById(record.id);
    }, [matrxRecordId, onDelete]);

    const handleAddMedia = useCallback(() => {
        // Implementation for adding media
        console.log('Adding media');
    }, []);

    const handleLinkBroker = useCallback(() => {
        // Implementation for linking broker
        console.log('Linking broker');
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!context.isEditorRegistered(matrxRecordId)) return;

            const state = context.getEditorState(matrxRecordId);
            const processedContent = context.getTextWithChipsReplaced(matrxRecordId, true);
            const rawContent = context.getTextWithChipsReplaced(matrxRecordId, false);

            const currentState = JSON.stringify({
                content: rawContent,
                processedContent,
                chips: state.chipData,
            });

            if (currentState !== lastEditorState) {
                const messageData: MessageData = {
                    id: matrxRecordId,
                    content: rawContent,
                    processedContent,
                    chips: state.chipData,
                };
                updateMessageContent(processedContent);
                onMessageUpdate?.(messageData);
                setLastEditorState(currentState);
            }

            const currentChipState = JSON.stringify(state.chipData);
            if (currentChipState !== lastChipState) {
                if (lastChipState) {
                    const prevChips: ChipData[] = JSON.parse(lastChipState);
                    const currentChips = state.chipData;

                    const addedChips = currentChips.filter((current) => !prevChips.find((prev) => prev.id === current.id));
                    const removedChips = prevChips.filter((prev) => !currentChips.find((current) => current.id === prev.id));
                    const updatedChips = currentChips.filter((current) => {
                        const prev = prevChips.find((p) => p.id === current.id);
                        return prev && JSON.stringify(prev) !== JSON.stringify(current);
                    });

                    addedChips.forEach((chip) => {
                        onChipUpdate?.({
                            chipId: chip.id,
                            brokerId: chip.brokerId,
                            action: 'add',
                            data: chip,
                        });
                    });

                    removedChips.forEach((chip) => {
                        onChipUpdate?.({
                            chipId: chip.id,
                            brokerId: chip.brokerId,
                            action: 'remove',
                            data: chip,
                        });
                    });

                    updatedChips.forEach((chip) => {
                        onChipUpdate?.({
                            chipId: chip.id,
                            brokerId: chip.brokerId,
                            action: 'update',
                            data: chip,
                        });
                    });
                }
                setLastChipState(currentChipState);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [context, matrxRecordId, lastEditorState, lastChipState, onMessageUpdate, onChipUpdate, updateMessageContent]);

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
        // Update internal state
        setIsEditorHidden((prev) => !prev);

        // Notify parent component
        if (onToggleEditor) {
            onToggleEditor(matrxRecordId);
        }
    }, [matrxRecordId, onToggleEditor]);

    const handleRoleChange = useCallback(
        (matrxRecordId: MatrxRecordId, newRole: 'user' | 'assistant' | 'system') => {
            dispatch(
                messageActions.updateUnsavedField({
                    recordId: matrxRecordId,
                    field: 'role',
                    value: newRole,
                })
            );
            updateRecord(matrxRecordId);
        },
        [dispatch]
    );

    const handleChipClick = useCallback((event: MouseEvent) => {
        const chip = (event.target as HTMLElement).closest('[data-chip]');
        if (!chip) return;
        
        const chipId = chip.getAttribute('data-chip-id');
        if (!chipId) return;

        console.log('Chip clicked:', chipId);
    }, []);

    const handleChipDoubleClick = useCallback((event: MouseEvent) => {
        const chip = (event.target as HTMLElement).closest('[data-chip]');
        if (!chip) return;
        
        const chipId = chip.getAttribute('data-chip-id');
        if (!chipId) return;
        
        setShowDialog(true);
    }, [setShowDialog]);

    const handleChipMouseEnter = useCallback((event: MouseEvent) => {
        const chip = (event.target as HTMLElement).closest('[data-chip]');
        if (!chip) return;
        
        const chipId = chip.getAttribute('data-chip-id');
        if (!chipId) return;

        console.log('Mouse entered chip:', chipId);
    }, []);

    const handleChipMouseLeave = useCallback((event: MouseEvent) => {
        const chip = (event.target as HTMLElement).closest('[data-chip]');
        if (!chip) return;
        
        const chipId = chip.getAttribute('data-chip-id');
        if (!chipId) return;

        console.log('Mouse left chip:', chipId);
    }, []);

    const handleChipContextMenu = useCallback((event: MouseEvent) => {
        const chip = (event.target as HTMLElement).closest('[data-chip]');
        if (!chip) return;
        
        const chipId = chip.getAttribute('data-chip-id');
        if (!chipId) return;
        
        event.preventDefault();
        event.stopPropagation();
        showMenu(matrxRecordId, chipId, event.clientX, event.clientY);
    }, [matrxRecordId, showMenu]);


    return (
            <Card className='h-full p-0 overflow-hidden bg-background border-elevation2'>
                <MessageToolbar
                    matrxRecordId={matrxRecordId}
                    role={record.role}
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
                    recipeMessageHook={recipeMessageHook}
                />

                <div className={`transition-all duration-200 ${isEditorHidden ? 'h-0 overflow-hidden' : 'h-[calc(100%-2rem)]'}`}>
                <EditorWithProviders
                    id={matrxRecordId}
                    initialContent={record.content}
                    className={className}
                    onBlur={handleBlur}
                    chipHandlers={{
                        onClick: handleChipClick,
                        onDoubleClick: handleChipDoubleClick,
                        onMouseEnter: handleChipMouseEnter,
                        onMouseLeave: handleChipMouseLeave,
                        onContextMenu: handleChipContextMenu
                    }}
                    {...props}
                />
            </div>
        </Card>
    );
};


ManagedMessageEditor.displayName = 'ManagedMessageEditor';

export default ManagedMessageEditor;
