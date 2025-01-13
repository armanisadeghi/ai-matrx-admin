import { useEffect, useState } from 'react';
import { useEditorContext } from '../provider/EditorProvider';

interface UseMessageEditorProps {
    id: string;
    onMessageUpdate?: (data: {
        content: string;
        processedContent: string;
        chips: any[];
    }) => void;
    onChipUpdate?: (data: {
        chipId: string;
        action: 'add' | 'update' | 'remove';
        data: any;
    }) => void;
}

export const useMessageEditor = ({ id, onMessageUpdate, onChipUpdate }: UseMessageEditorProps) => {
    const context = useEditorContext();
    const [lastState, setLastState] = useState<string>('');

    // Monitor editor state changes
    useEffect(() => {
        if (!context.isEditorRegistered(id)) return;

        const interval = setInterval(() => {
            const editorState = context.getEditorState(id);
            const content = context.getTextWithChipsReplaced(id, false);
            const processedContent = context.getTextWithChipsReplaced(id, true);

            const currentState = JSON.stringify({
                content,
                chips: editorState.chipData
            });

            if (currentState !== lastState) {
                // Monitor overall message changes
                onMessageUpdate?.({
                    content,
                    processedContent,
                    chips: editorState.chipData
                });

                // Check for chip changes
                if (lastState) {
                    const prevState = JSON.parse(lastState);
                    const prevChips = prevState.chips || [];
                    
                    // Detect added chips
                    editorState.chipData.forEach(chip => {
                        if (!prevChips.find(p => p.id === chip.id)) {
                            onChipUpdate?.({
                                chipId: chip.id,
                                action: 'add',
                                data: chip
                            });
                        }
                    });

                    // Detect removed chips
                    prevChips.forEach(prevChip => {
                        if (!editorState.chipData.find(c => c.id === prevChip.id)) {
                            onChipUpdate?.({
                                chipId: prevChip.id,
                                action: 'remove',
                                data: prevChip
                            });
                        }
                    });

                    // Detect updated chips
                    editorState.chipData.forEach(chip => {
                        const prevChip = prevChips.find(p => p.id === chip.id);
                        if (prevChip && JSON.stringify(prevChip) !== JSON.stringify(chip)) {
                            onChipUpdate?.({
                                chipId: chip.id,
                                action: 'update',
                                data: chip
                            });
                        }
                    });
                }

                setLastState(currentState);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [context, id, lastState, onMessageUpdate, onChipUpdate]);
};