import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { EditorWithProviders } from '@/features/rich-text-editor/provider/withManagedEditor';
import { Card } from '@/components/ui';
import { MatrxRecordId } from '@/types';
import MessageToolbar from './MessageToolbar';

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
    onDelete?: (id: string) => void;
    onMessageUpdate?: (messageData: MessageData) => void;
    onChipUpdate?: (chipData: ChipChangeData) => void;
    onToggleEditor?: (matrxRecordId: MatrxRecordId) => void;
    deleteMessageById?: (id: string) => void;
}

type MessageTemplateDataOptional = {
    id?: string;
    type?: 'text' | 'base64_image' | 'blob' | 'image_url' | 'other';
    role?: 'user' | 'assistant' | 'system';
    content?: string;
};

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
    deleteMessageById,
    ...props
}) => {
    const dispatch = useAppDispatch();
    const { actions, selectors, store } = useEntityTools('messageTemplate');

    const record = selectors.selectRecord(store.getState(), matrxRecordId) as MessageTemplateDataOptional;
    const context = useEditorContext();
    const [isEditorHidden, setIsEditorHidden] = useState(isCollapsed);
    const [lastEditorState, setLastEditorState] = useState<string>('');
    const [lastChipState, setLastChipState] = useState<string>('');
    const { updateRecord } = useUpdateRecord('messageTemplate');

    const updateMessageContent = useCallback(
        (content: string) => {
            dispatch(
                actions.updateUnsavedField({
                    recordId: matrxRecordId,
                    field: 'content',
                    value: content,
                })
            );
        },
        [actions, dispatch, matrxRecordId]
    );

    useEffect(() => {
        setIsEditorHidden(isCollapsed);
    }, [isCollapsed]);

    const handleSave = useCallback(() => {
        const processedContent = context.getTextWithChipsReplaced(matrxRecordId, true);
        updateMessageContent(processedContent);
        updateRecord(matrxRecordId);
    }, [context, matrxRecordId, dispatch, actions, updateRecord]);

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

    return (
        <Card className='h-full p-0 overflow-hidden bg-background border-elevation2'>
            <MessageToolbar
                id={matrxRecordId}
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
            />

            <div className={`transition-all duration-200 ${isEditorHidden ? 'h-0 overflow-hidden' : 'h-[calc(100%-2rem)]'}`}>
                <EditorWithProviders
                    id={matrxRecordId}
                    initialContent={record.content}
                    className={className}
                    {...props}
                />
            </div>
        </Card>
    );
};

ManagedMessageEditor.displayName = 'ManagedMessageEditor';

export default ManagedMessageEditor;
