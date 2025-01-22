// EditorProvider.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ContentMetadata, EditorState } from '../types/editor.types';
import { replaceChipsWithStringValues } from '../utils/editorStateUtils';
import { EditorLayout, useEditorLayout } from './hooks/useEditorLayout';
import { EditorRegistration, useEditorRegistration } from './hooks/useEditorRegistration';
import { useProviderChips, ProviderChipsHook } from './hooks/useProviderChips';
import { ColorManagement, useColorManagement } from '../hooks/useColorManagement';
import { createEditorContentService, EditorContentService } from './EditorContentService';
import { useEntityTools } from '@/lib/redux';


export type EditorStates = Map<string, EditorState>;

export interface EditorContextValue {
    setPlainTextContent: (editorId: string, content: string) => void;
    getEditorState: (editorId: string) => EditorState;
    getAllEditorStates: () => { [key: string]: EditorState };
    plainTextContent: (editorId: string) => string;
    getTextWithChipsReplaced: (editorId: string, showTokenIds?: boolean) => string;
    getContentWithMetadata: (editorId: string, showTokenIds?: boolean) => string;
    coordinatedSave: (editorId: string) => Promise<void>;
    setInitialContent: (editorId: string, content: string) => Promise<EditorState>;

    messagesLoading: boolean;
    setMessagesLoading: (loading: boolean) => void;

    // Editor Hooks
    registry: EditorRegistration;
    layout: EditorLayout;
    colors: ColorManagement;
    chips: ProviderChipsHook;
    contentService: EditorContentService;
}

export const DEFAULT_METADATA: ContentMetadata = {
    chips: [],
    brokers: [],
    version: '1.0'
};

export const getEmptyState = (): EditorState => ({
    plainTextContent: '',
    chipData: [],
    metadata: { ...DEFAULT_METADATA }
});



const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [editors, setEditors] = useState<EditorStates>(new Map());
    const [messagesLoading, setMessagesLoading] = useState(false);
    const messageTools = useEntityTools('messageTemplate');
    const brokerTools = useEntityTools('dataBroker');
    const colors = useColorManagement();
    const registry = useEditorRegistration(editors, setEditors);
    const layout = useEditorLayout(editors, setEditors);
    const contentService = createEditorContentService(messageTools, brokerTools);

    const {
        getContentForStorage,
        saveContent
    } = contentService;

    const getEditorState = useCallback(
        (editorId: string) => {
            const state = editors.get(editorId);
            if (!state) {
                console.log('-------------------------------Editor state not found for id:', editorId);
                return getEmptyState();
            }
            return state;
        },
        [editors]
    );


    const getContentWithMetadata = useCallback(
        (editorId: string, showTokenIds = false): string => {
            const state = getEditorState(editorId);
            return getContentForStorage(state);
        },
        [getEditorState, contentService]
    );

    const coordinatedSave = useCallback(
        async (editorId: string) => {
            const state = getEditorState(editorId);
            await saveContent(editorId, state);
        },
        [getEditorState, saveContent]
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

    const setInitialContent = useCallback(
        async (editorId: string, richContent: string): Promise<EditorState> => {
            try {
                const parsedState = contentService.parseStoredContent(richContent);
                updateEditorState(editorId, parsedState);
                return parsedState;
            } catch (error) {
                console.error('Error setting initial content:', error);
                return getEmptyState();
            }
        },
        [contentService, updateEditorState]
    );

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
            console.log('Setting plain text content:', content);
            updateEditorState(editorId, { plainTextContent: content });
        },
        [updateEditorState]
    );

    const getTextWithChipsReplaced = useCallback(
        (editorId: string, showTokenIds = false): string => {

            const state = getEditorState(editorId);
            console.log('Getting text with chips replaced:', state);
            const contentWithChilsReplaced = replaceChipsWithStringValues(state, showTokenIds);
            console.log('Content with chips replaced:', contentWithChilsReplaced);
            return contentWithChilsReplaced;
        },
        [getEditorState]
    );

    const value: EditorContextValue = {
        registry,
        layout,
        colors,
        chips,
        contentService,
        getEditorState,
        getAllEditorStates,
        plainTextContent,
        setPlainTextContent,
        getTextWithChipsReplaced,
        setInitialContent,
        getContentWithMetadata,
        messagesLoading, 
        setMessagesLoading,
        coordinatedSave,
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
