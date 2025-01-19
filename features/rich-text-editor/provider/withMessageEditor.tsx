import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorWithProviders } from './withManagedEditor';
import { useEditorContext } from './EditorProvider';
import { ChipData } from '../types/editor.types';
import { useEntityTools } from '@/lib/redux';
import { toMatrxIdFromValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';

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
    id: string;
    initialContent?: string;
    className?: string;
    onMessageUpdate?: (messageData: MessageData) => void;
    onChipUpdate?: (chipData: ChipChangeData) => void;
    handleSave?: () => void;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({ 
    id, 
    initialContent = '', 
    className, 
    onMessageUpdate, 
    onChipUpdate,
    handleSave,
    ...props 
}) => {
    const context = useEditorContext();
    const [lastEditorState, setLastEditorState] = useState<string>('');
    const [lastChipState, setLastChipState] = useState<string>('');
    const { actions, dispatch } = useEntityTools('messageTemplate');
    const { updateRecord } = useUpdateRecord('messageTemplate');
    const recordId = useMemo(() => toMatrxIdFromValue('messageTemplate', id), [id]);

    const updateMessageContent = useCallback(
        (content: string) => {
            dispatch(actions.updateUnsavedField({
                recordId,
                field: 'content',
                value: content,
            }));
        },
        [actions, dispatch, recordId]
    );

    useEffect(() => {
        const interval = setInterval(() => {
            if (!context.isEditorRegistered(id)) return;

            const state = context.getEditorState(id);
            const processedContent = context.getTextWithChipsReplaced(id, true);
            const rawContent = context.getTextWithChipsReplaced(id, false);

            const currentState = JSON.stringify({
                content: rawContent,
                processedContent,
                chips: state.chipData,
            });

            if (currentState !== lastEditorState) {
                const messageData: MessageData = {
                    id,
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
    }, [context, id, lastEditorState, lastChipState, onMessageUpdate, onChipUpdate, updateMessageContent]);

    const saveContent = useCallback(() => {
        const processedContent = context.getTextWithChipsReplaced(id, true);
        dispatch(actions.updateUnsavedField({
            recordId,
            field: 'content',
            value: processedContent
        }));
        updateRecord(recordId);
        if (handleSave) {
            handleSave();
        }
    }, [context, id, recordId, dispatch, actions, updateRecord, handleSave]);

    useEffect(() => {
        if (handleSave) {
            saveContent();
        }
    }, [handleSave, saveContent]);

    return (
        <EditorWithProviders
            id={id}
            initialContent={initialContent}
            className={className}
            {...props}
        />
    );
};

MessageEditor.displayName = 'MessageEditor';

export default MessageEditor;


