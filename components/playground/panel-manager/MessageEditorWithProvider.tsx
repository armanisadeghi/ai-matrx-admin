import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';
import { EditorState, useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { EditorWithProviders } from '@/features/rich-text-editor/provider/withManagedEditor';
import { Card } from '@/components/ui';
import { MatrxRecordId } from '@/types';
import MessageToolbar from './MessageToolbar';
import { ProcessedRecipeMessages } from './types';
import { UseRecipeMessagesHook } from '../hooks/dev/useMessageWithNew';
import { AddBrokerPayload, useAddBroker } from '../hooks/brokers/useAddBroker';
import { useChipMenu } from '@/features/rich-text-editor/components/ChipContextMenu';
import { isEqual } from 'lodash';
import { useEditorChips } from '@/features/rich-text-editor/hooks/useEditorChips';
import { v4 } from 'uuid';

const INITIAL_PANELS: ProcessedRecipeMessages[] = [
    {
        id: 'system-1',
        matrxRecordId: 'system-1',
        role: 'system',
        type: 'text',
        content: '',
        order: 0,
    },
    {
        id: 'user-1',
        matrxRecordId: 'user-1',
        role: 'user',
        type: 'text',
        content: '',
        order: 1,
    },
];

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
    isCollapsed = false,
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
    const context = useEditorContext();
    const { updateRecord } = useUpdateRecord('messageTemplate');
    const { showMenu } = useChipMenu();
    const { addBroker } = useAddBroker(matrxRecordId);
    const { updateBrokerConnection, updateChip } = useEditorChips(matrxRecordId);

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedContent, setLastSavedContent] = useState('');
    const [isEditorHidden, setIsEditorHidden] = useState(isCollapsed);
    const [lastEditorState, setLastEditorState] = useState<EditorState>(() => context.getEditorState(matrxRecordId));
    const [showDialog, setShowDialog] = useState(false);

    const { actions: messageActions, selectors: messageSelectors } = useEntityTools('messageTemplate');
    const { actions: brokerActions, selectors: brokerSelectors, store } = useEntityTools('dataBroker');
    const { messages, deleteMessageById } = recipeMessageHook;

    const record = useMemo(() => {
        const existingMessage = messages.find((message) => message.matrxRecordId === matrxRecordId);
        if (existingMessage) return existingMessage;

        const initialPanel = INITIAL_PANELS.find((panel) => panel.matrxRecordId === matrxRecordId);
        return initialPanel || INITIAL_PANELS[0];
    }, [messages, matrxRecordId]) as ProcessedRecipeMessages;

    useEffect(() => {
        setIsEditorHidden(isCollapsed);
    }, [isCollapsed]);

    useEffect(() => {
        if (record?.content) {
            setLastSavedContent(record.content);
        }
    }, [record?.content]);

    useEffect(() => {
        if (!context.isEditorRegistered(matrxRecordId)) return;

        const interval = setInterval(() => {
            const currentState = context.getEditorState(matrxRecordId);
            const processedContent = context.getTextWithChipsReplaced(matrxRecordId, true);
            const rawContent = context.getTextWithChipsReplaced(matrxRecordId, false);

            if (!isEqual(currentState, lastEditorState)) {
                const messageData: MessageData = {
                    id: matrxRecordId,
                    content: rawContent,
                    processedContent,
                    chips: currentState.chipData,
                };

                onMessageUpdate?.(messageData);
                setLastEditorState(currentState);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [context, matrxRecordId, lastEditorState, onMessageUpdate]);

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
            updateBrokerConnection(chipData.id, `id:${addBrokerPayload.id}`);
        },
        [addBroker, updateBrokerConnection]
    );

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

    const handleBlur = useCallback(() => {
        handleSave();
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

        // Add the test attribute to the clicked chip
        chip.setAttribute('data-test-clicked', 'true');

        console.log('Chip clicked:', chipId);
    }, []);

    const handleChipDoubleClick = useCallback(
        (event: MouseEvent) => {
            const chip = (event.target as HTMLElement).closest('[data-chip]');
            if (!chip) return;

            const chipId = chip.getAttribute('data-chip-id');
            if (!chipId) return;

            setShowDialog(true);
        },
        [setShowDialog]
    );

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

    const handleChipContextMenu = useCallback(
        (event: MouseEvent) => {
            const chip = (event.target as HTMLElement).closest('[data-chip]');
            if (!chip) return;

            const chipId = chip.getAttribute('data-chip-id');
            if (!chipId) return;

            event.preventDefault();
            event.stopPropagation();
            showMenu(matrxRecordId, chipId, event.clientX, event.clientY);
        },
        [matrxRecordId, showMenu]
    );

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
