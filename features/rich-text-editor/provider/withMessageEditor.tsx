// withMessageEditor.tsx
import React, { useEffect, useState } from 'react';
import { EditorWithProviders } from './withManagedEditor'; // This is our base that handles registration
import { useEditorContext } from './EditorProvider';
import { ChipData } from '../types/editor.types';

interface MessageEditorProps {
    id: string;
    initialContent?: string;
    className?: string;
    onMessageUpdate?: (messageData: MessageData) => void;
    onChipUpdate?: (chipData: ChipChangeData) => void;
}

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

// We're wrapping the EditorWithProviders which already handles registration
const MessageEditor: React.FC<MessageEditorProps> = ({
    id,
    initialContent = '',
    className,
    onMessageUpdate,
    onChipUpdate,
    ...props
}) => {
    const context = useEditorContext();
    const [lastEditorState, setLastEditorState] = useState<string>('');
    const [lastChipState, setLastChipState] = useState<string>('');

    // Watch for changes in editor state and content
    useEffect(() => {
        const interval = setInterval(() => {
            if (!context.isEditorRegistered(id)) return;

            const state = context.getEditorState(id);
            const processedContent = context.getTextWithChipsReplaced(id, true);
            const rawContent = context.getTextWithChipsReplaced(id, false);

            // Create current state snapshot
            const currentState = JSON.stringify({
                content: rawContent,
                processedContent,
                chips: state.chipData
            });

            // Check if state has changed
            if (currentState !== lastEditorState) {
                const messageData: MessageData = {
                    id,
                    content: rawContent,
                    processedContent,
                    chips: state.chipData,
                };

                onMessageUpdate?.(messageData);
                setLastEditorState(currentState);
            }

            // Monitor chip changes separately
            const currentChipState = JSON.stringify(state.chipData);
            if (currentChipState !== lastChipState) {
                // Find what changed by comparing with previous state
                if (lastChipState) {
                    const prevChips: ChipData[] = JSON.parse(lastChipState);
                    const currentChips = state.chipData;

                    // Check for added chips
                    const addedChips = currentChips.filter(
                        current => !prevChips.find(prev => prev.id === current.id)
                    );

                    // Check for removed chips
                    const removedChips = prevChips.filter(
                        prev => !currentChips.find(current => current.id === prev.id)
                    );

                    // Check for updated chips
                    const updatedChips = currentChips.filter(current => {
                        const prev = prevChips.find(p => p.id === current.id);
                        return prev && JSON.stringify(prev) !== JSON.stringify(current);
                    });

                    // Notify of changes
                    addedChips.forEach(chip => {
                        onChipUpdate?.({
                            chipId: chip.id,
                            brokerId: chip.brokerId,
                            action: 'add',
                            data: chip
                        });
                    });

                    removedChips.forEach(chip => {
                        onChipUpdate?.({
                            chipId: chip.id,
                            brokerId: chip.brokerId,
                            action: 'remove',
                            data: chip
                        });
                    });

                    updatedChips.forEach(chip => {
                        onChipUpdate?.({
                            chipId: chip.id,
                            brokerId: chip.brokerId,
                            action: 'update',
                            data: chip
                        });
                    });
                }

                setLastChipState(currentChipState);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [context, id, lastEditorState, lastChipState, onMessageUpdate, onChipUpdate]);

    return (
            <EditorWithProviders
                id={id}
                initialContent={initialContent}
                {...props}
            />
    );
};

export default MessageEditor;



// Example usage:
/*
const MyMessageContainer = () => {
    const { updateMessage, updateChipRelationships } = useMessageActions();

    const handleMessageUpdate = (messageData: MessageData) => {
        updateMessage({
            id: messageData.id,
            content: messageData.processedContent,
            // other fields as needed
        });
    };

    const handleChipUpdate = (chipChange: ChipChangeData) => {
        switch (chipChange.action) {
            case 'add':
                // Handle new chip creation
                createChipRelationship({
                    chipId: chipChange.chipId,
                    brokerId: chipChange.brokerId,
                    content: chipChange.data.stringValue
                });
                break;
            case 'update':
                // Handle chip updates
                updateChipRelationship({
                    chipId: chipChange.chipId,
                    brokerId: chipChange.brokerId,
                    content: chipChange.data.stringValue
                });
                break;
            case 'remove':
                // Handle chip removal
                removeChipRelationship(chipChange.chipId);
                break;
        }
    };

    return (
        <MessageEditor
            id="message-1"
            initialContent=""
            onMessageUpdate={handleMessageUpdate}
            onChipUpdate={handleChipUpdate}
        />
    );
};
*/