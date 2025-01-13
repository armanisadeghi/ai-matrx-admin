// useEditorVisualizer.ts - This is the hook specifically for visualization
import { useState, useEffect } from 'react';
import { useEditorContext } from '../provider/EditorProvider';

export const useEditorVisualizer = () => {
    const context = useEditorContext();
    const [showTokenIds, setShowTokenIds] = useState(false);
    const [activeEditorId, setActiveEditorId] = useState<string>('');
    const [registeredEditors, setRegisteredEditors] = useState<string[]>([]);

    // Track registered editors
    useEffect(() => {
        const findRegisteredEditors = () => {
            const potentialEditors = Array.from({ length: 100 }, (_, i) => `editor-${i}`);
            return potentialEditors.filter(id => context.isEditorRegistered(id));
        };

        const interval = setInterval(() => {
            const editors = findRegisteredEditors();
            setRegisteredEditors(editors);
            
            if (!activeEditorId && editors.length > 0) {
                setActiveEditorId(editors[0]);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [context, activeEditorId]);

    return {
        // Editor registration
        registeredEditors,
        activeEditorId,
        setActiveEditorId,

        // Editor state
        getEditorState: (id: string) => context.getEditorState(id),
        getProcessedContent: (id: string) => context.getTextWithChipsReplaced(id, showTokenIds),
        getEditorLayout: (id: string) => context.getEditorLayout(id),

        // Token display
        showTokenIds,
        toggleTokenIds: () => setShowTokenIds(prev => !prev),

        // Context methods
        isEditorRegistered: context.isEditorRegistered
    };
};