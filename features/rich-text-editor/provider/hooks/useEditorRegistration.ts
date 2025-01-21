import { useRef, useCallback } from 'react';
import { EditorStates, getInitialEditorState } from '../EditorProvider';
import { LayoutMetadata } from '../../types/editor.types';


export const useEditorRegistration = (editors: EditorStates, setEditors: (updater: (prev: EditorStates) => EditorStates) => void) => {
    const registrationRef = useRef(new Set<string>());

    const registerEditor = useCallback(
        (editorId: string, initialLayout?: LayoutMetadata) => {
            if (registrationRef.current.has(editorId)) {
                // console.log('Skipping duplicate registration:', editorId);
                return;
            }

            // console.log('Registering editor:', editorId);
            registrationRef.current.add(editorId);

            setEditors((prev) => {
                if (prev.has(editorId)) return prev;
                const next = new Map(prev);
                const initialState = getInitialEditorState();
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
                // console.log('Skipping unregistration of unknown editor:', editorId);
                return;
            }

            // console.log('Unregistering editor:', editorId);
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