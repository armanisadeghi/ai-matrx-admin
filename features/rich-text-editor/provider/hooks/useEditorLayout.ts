// hooks/useEditorLayout.ts
import { useCallback } from 'react';
import { EditorStates } from '../new/EditorProvider';
import { LayoutMetadata } from '../../types/editor.types';

// https://claude.ai/chat/61703be2-4230-4ce9-9f44-5317640ddf5a

export const useEditorLayout = (editors: EditorStates, setEditors: (updater: (prev: EditorStates) => EditorStates) => void) => {
    const setEditorLayout = useCallback(
        (editorId: string, layout: LayoutMetadata) => {
            setEditors((prev) => {
                const current = prev.get(editorId);
                if (!current) return prev;

                const next = new Map(prev);
                next.set(editorId, { ...current, layout });
                return next;
            });
        },
        [setEditors]
    );

    const updateEditorLayout = useCallback(
        (editorId: string, updates: Partial<LayoutMetadata>) => {
            setEditors((prev) => {
                const current = prev.get(editorId);
                if (!current || !current.layout) return prev;

                const next = new Map(prev);
                next.set(editorId, {
                    ...current,
                    layout: { ...current.layout, ...updates },
                });
                return next;
            });
        },
        [setEditors]
    );

    const getEditorLayout = useCallback(
        (editorId: string) => {
            return editors.get(editorId)?.layout;
        },
        [editors]
    );

    const getVisibleEditors = useCallback(() => {
        return Array.from(editors.entries())
            .filter(([_, state]) => state.layout?.isVisible)
            .map(([id]) => id);
    }, [editors]);

    const getEditorsByPosition = useCallback(() => {
        return Array.from(editors.entries())
            .filter(([_, state]) => state.layout)
            .map(([id, state]) => ({
                id,
                layout: state.layout!,
            }))
            .sort((a, b) => {
                const posA = a.layout.position;
                const posB = b.layout.position;

                if (typeof posA === 'number' && typeof posB === 'number') {
                    return posA - posB;
                }
                return String(posA).localeCompare(String(posB));
            });
    }, [editors]);

    const setEditorVisibility = useCallback(
        (editorId: string, isVisible: boolean) => {
            updateEditorLayout(editorId, { isVisible });
        },
        [updateEditorLayout]
    );

    // Add a convenience method for moving editors
    const moveEditor = useCallback(
        (fromIndex: number, toIndex: number) => {
            const editorsList = getEditorsByPosition();

            editorsList.forEach(({ id, layout }) => {
                const currentPos = layout.position as number;
                let newPos = currentPos;

                if (fromIndex < toIndex) {
                    if (currentPos > fromIndex && currentPos <= toIndex) {
                        newPos = currentPos - 1;
                    }
                } else {
                    if (currentPos >= toIndex && currentPos < fromIndex) {
                        newPos = currentPos + 1;
                    }
                }

                if (currentPos === fromIndex) {
                    newPos = toIndex;
                }

                if (newPos !== currentPos) {
                    updateEditorLayout(id, { position: newPos });
                }
            });
        },
        [getEditorsByPosition, updateEditorLayout]
    );

    return {
        setEditorLayout,
        updateEditorLayout,
        getEditorLayout,
        getVisibleEditors,
        getEditorsByPosition,
        setEditorVisibility,
        moveEditor,
    };
};

export type EditorLayout = ReturnType<typeof useEditorLayout>;
