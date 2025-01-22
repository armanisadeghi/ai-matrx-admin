import { useRef, useCallback } from 'react';
import { DEFAULT_METADATA, EditorStates, } from '../EditorProvider';
import { EditorState, LayoutMetadata } from '../../types/editor.types';


export const getEmptyState = (initialContent): EditorState => ({
    plainTextContent: initialContent,
    chipData: [],
    metadata: { ...DEFAULT_METADATA }
});


export const useEditorRegistration = (editors: EditorStates, setEditors: (updater: (prev: EditorStates) => EditorStates) => void) => {
    const registrationRef = useRef(new Set<string>());

    const registerEditor = useCallback(
        (editorId: string, initialContent?: string, initialLayout?: LayoutMetadata) => {
            if (registrationRef.current.has(editorId)) {
                return;
            }

            registrationRef.current.add(editorId);

            const startingContent = initialContent || '';

            setEditors((prev) => {
                if (prev.has(editorId)) return prev;
                const next = new Map(prev);
                const initialState = getEmptyState(startingContent);
                if (initialLayout) {
                    initialState.layout = initialLayout;
                }
                next.set(editorId, initialState);
                return next;
            });
        },
        [setEditors]
    );

    const unregisterEditor = useCallback(
        (editorId: string) => {
            if (!registrationRef.current.has(editorId)) {
                return;
            }

            registrationRef.current.delete(editorId);

            setEditors((prev) => {
                const next = new Map(prev);
                next.delete(editorId);
                return next;
            });
        },
        [setEditors]
    );

    const isEditorRegistered = useCallback((editorId: string) => {
        return registrationRef.current.has(editorId);
    }, []);

    return {
        registerEditor,
        unregisterEditor,
        isEditorRegistered,
    };
};

export type EditorRegistration = ReturnType<typeof useEditorRegistration>;