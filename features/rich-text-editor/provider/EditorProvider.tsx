// EditorProvider.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChipData, EditorState } from '../types/editor.types';
import { replaceChipsWithStringValues } from '../utils/editorStateUtils';
import { EditorLayout, useEditorLayout } from './hooks/useEditorLayout';
import { EditorRegistration, useEditorRegistration } from './hooks/useEditorRegistration';
import { useProviderChips, ProviderChipsHook } from './hooks/useProviderChips';
import { ColorManagement, useColorManagement } from '../hooks/useColorManagement';


export type EditorStates = Map<string, EditorState>;

export interface EditorContextValue {
    setPlainTextContent: (editorId: string, content: string) => void;
    getEditorState: (editorId: string) => EditorState;
    getAllEditorStates: () => { [key: string]: EditorState };
    plainTextContent: (editorId: string) => string;
    getTextWithChipsReplaced: (editorId: string, showTokenIds?: boolean) => string;

    messagesLoading: boolean;
    setMessagesLoading: (loading: boolean) => void;

    // Editor Hooks
    registry: EditorRegistration;
    layout: EditorLayout;
    colors: ColorManagement;
    chips: ProviderChipsHook;
}

export const getInitialEditorState = (): EditorState => ({
    plainTextContent: '',
    chipData: [],
});

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [editors, setEditors] = useState<EditorStates>(new Map());
    const [messagesLoading, setMessagesLoading] = useState(false);

    const colors = useColorManagement();
    const registry = useEditorRegistration(editors, setEditors);
    const layout = useEditorLayout(editors, setEditors);

    const getEditorState = useCallback(
        (editorId: string) => {
            const state = editors.get(editorId);
            if (!state) {
                return getInitialEditorState();
            }
            return state;
        },
        [editors]
    );

    const updateEditorState = useCallback((editorId: string, updates: Partial<EditorState>) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, { ...current, ...updates });
            return next;
        });
    }, []);

    const chips = useProviderChips(editors, messagesLoading, setEditors, getEditorState, updateEditorState, colors);
    const {
        getAllChipData,
        getChipsForBroker,
        setChipData,
        createNewChipData,
        generateLabel,
        addChipData,
        removeChipData,
        updateChipData,
        syncChipToBroker,
    } = chips;

    const getAllEditorStates = useCallback(() => {
        const editorStatesObject: { [key: string]: EditorState } = {};
        editors.forEach((state, editorId) => {
            editorStatesObject[editorId] = state;
        });
        return editorStatesObject;
    }, [editors]);


    const plainTextContent = useCallback(
        (editorId: string) => {
            const state = getEditorState(editorId);
            return state.plainTextContent;
        },
        [getEditorState]
    );

    const setPlainTextContent = useCallback(
        (editorId: string, content: string) => {
            updateEditorState(editorId, { plainTextContent: content });
        },
        [updateEditorState]
    );

    const getTextWithChipsReplaced = useCallback(
        (editorId: string, showTokenIds = false): string => {
            const state = getEditorState(editorId);
            return replaceChipsWithStringValues(state, showTokenIds);
        },
        [getEditorState]
    );

    const value: EditorContextValue = {
        registry,
        layout,
        colors,
        chips,
        getEditorState,
        getAllEditorStates,
        plainTextContent,
        setPlainTextContent,
        getTextWithChipsReplaced,
        messagesLoading, 
        setMessagesLoading,
    };

    return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

export const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error('useEditorContext must be used within an EditorProvider');
    }
    return context;
};
