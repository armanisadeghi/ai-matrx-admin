import { useRef, useCallback } from 'react';
import { EditorState, LayoutMetadata } from '../../types/editor.types';
import { DisplayMode, transformMatrxText, getProcessedMetadataFromText } from '../../utils/patternUtils';
import { EditorStates } from '../provider';

const initialState: EditorState = {
    content: '',
    contentMode: 'encodeChips',
    chipData: [],
    metadata: [],
    layout: {
        position: 0,
        isVisible: true,
    },
};

export const getInitialState = (initialContent: string): EditorState => ({
    ...initialState,
    content: initialContent,
    metadata: getProcessedMetadataFromText(initialContent),
});

export const useEditorRegistration = (
    editors: EditorStates, 
    setEditors: (updater: (prev: EditorStates) => EditorStates) => void
) => {
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
                const initialState = getInitialState(startingContent);
                
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

    const isEditorRegistered = useCallback(
        (editorId: string) => {
            return registrationRef.current.has(editorId);
        }, 
        []
    );

    return {
        registerEditor,
        unregisterEditor,
        isEditorRegistered,
    };
};

export type EditorRegistration = ReturnType<typeof useEditorRegistration>;