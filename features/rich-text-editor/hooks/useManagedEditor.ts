// hooks/useManagedEditor.ts
import { useRefManager } from '@/lib/refs';
import { useEditorContext } from '../provider/new/EditorProvider';
import { useCallback } from 'react';

export const useManagedEditor = (editorId: string) => {
    const refManager = useRefManager();
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);

    // Combine ref manager methods and context state
    return {
        // Core editor methods (from ref manager)
        getText: () => refManager.call(editorId, 'getText'),
        setText: (content: string) => refManager.call(editorId, 'setContent', content),
        focus: () => refManager.call(editorId, 'focus'),
        
        // Chip-related methods
        insertChip: () => refManager.call(editorId, 'insertChip'),
        convertSelectionToChip: () => refManager.call(editorId, 'convertSelectionToChip'),
        
        // Style methods
        applyStyle: (style: any) => refManager.call(editorId, 'applyStyle', style),
        
        // State from context
        chipCount: editorState.chipCounter,
        chipData: editorState.chipData,
        plainTextContent: editorState.plainTextContent,
        
        // Combined operations
        createAndInsertChip: useCallback(async () => {
            const chipData = context.createNewChipData(editorId);
            await refManager.call(editorId, 'insertChip');
            return chipData;
        }, [editorId, context, refManager])
    };
};
