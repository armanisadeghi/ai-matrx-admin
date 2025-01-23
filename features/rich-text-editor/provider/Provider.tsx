import React, { createContext, useContext, useState, useCallback } from 'react';
import { BrokerMetaData, ContentMode, EditorState } from '../types/editor.types';
import { EditorLayout, useEditorLayout } from './hooks/useEditorLayout';
import { EditorRegistration, getInitialState, useEditorRegistration } from './hooks/useEditorRegistration';
import { useProviderChips, ProviderChipsHook } from './hooks/useProviderChips';
import { ColorManagement, useColorManagement } from '../hooks/useColorManagement';
import { DisplayMode, transformMatrxText, getProcessedMetadataFromText } from '../utils/patternUtils';

export type EditorStates = Map<string, EditorState>;

export interface EditorContextValue {
    setContent: (editorId: string, content: string) => void;
    getContent: (editorId: string) => string;
    getContentMode: (editorId: string) => string;
    setContentMode: (editorId: string, contentMode: ContentMode) => void;
    getEditorState: (editorId: string) => EditorState;
    getAllEditorStates: () => { [key: string]: EditorState };
    getTextWithChipsReplaced: (editorId: string) => string;
    getContentByMode: (editorId: string, mode: DisplayMode) => string;
    getContentByCurrentMode: (editorId: string) => string;
    updateBrokerMetadata: (editorId: string) => void;
    updateAllBrokerMetadata: () => void;
    messagesLoading: boolean;
    setMessagesLoading: (loading: boolean) => void;

    registry: EditorRegistration;
    layout: EditorLayout;
    colors: ColorManagement;
    chips: ProviderChipsHook;
}

const getDisplayMode = (contentMode: ContentMode): DisplayMode => {
    switch (contentMode) {
        case 'encodeChips':
        case 'encodeVisible':
            return DisplayMode.ENCODED;
        case 'name':
            return DisplayMode.NAME;
        case 'defaultValue':
            return DisplayMode.DEFAULT_VALUE;
        case 'recordKey':
            return DisplayMode.RECORD_KEY;
        case 'status':
            return DisplayMode.STATUS;
        default:
            return DisplayMode.ENCODED;
    }
};


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
                console.log('Editor state not found for id:', editorId);
                return getInitialState('');
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

    const processContentAndUpdateMetadata = useCallback((content: string): BrokerMetaData[] => {
        return getProcessedMetadataFromText(content);
    }, []);

    const updateBrokerMetadata = useCallback(
        (editorId: string) => {
            const currentState = getEditorState(editorId);
            const processedMetadata = processContentAndUpdateMetadata(currentState.content);
            updateEditorState(editorId, { metadata: processedMetadata });
        },
        [getEditorState, updateEditorState, processContentAndUpdateMetadata]
    );

    const updateAllBrokerMetadata = useCallback(() => {
        editors.forEach((_, editorId) => {
            updateBrokerMetadata(editorId);
        });
    }, [editors, updateBrokerMetadata]);

    const chips = useProviderChips(editors, messagesLoading, setEditors, getEditorState, updateEditorState, colors);

    const getAllEditorStates = useCallback(() => {
        const editorStatesObject: { [key: string]: EditorState } = {};
        editors.forEach((state, editorId) => {
            editorStatesObject[editorId] = state;
        });
        return editorStatesObject;
    }, [editors]);

    const getContent = useCallback(
        (editorId: string) => {
            const state = getEditorState(editorId);
            return state.content;
        },
        [getEditorState]
    );

    const setContent = useCallback(
        (editorId: string, content: string) => {
            const processedMetadata = processContentAndUpdateMetadata(content);
            updateEditorState(editorId, { 
                content,
                metadata: processedMetadata 
            });
        },
        [updateEditorState, processContentAndUpdateMetadata]
    );

    const getContentMode = useCallback(
        (editorId: string): string => {
            const state = getEditorState(editorId);
            return state.contentMode;
        },
        [getEditorState]
    );

    const setContentMode = useCallback(
        (editorId: string, contentMode: ContentMode) => {
            updateEditorState(editorId, { contentMode });
        },
        [updateEditorState]
    );


    const getTextWithChipsReplaced = useCallback(
        (editorId: string): string => {
            const state = getEditorState(editorId);
            return transformMatrxText(state.content, DisplayMode.ENCODED);
        },
        [getEditorState]
    );

    const getContentByMode = useCallback(
        (editorId: string, mode: DisplayMode): string => {
            const state = getEditorState(editorId);
            return transformMatrxText(state.content, mode);
        },
        [getEditorState]
    );
    
    const getContentByCurrentMode = useCallback(
        (editorId: string): string => {
            const state = getEditorState(editorId);
            const displayMode = getDisplayMode(state.contentMode);
            return transformMatrxText(state.content, displayMode);
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
        getContent,
        setContent,
        getContentMode,
        setContentMode,
        getTextWithChipsReplaced,
        getContentByMode,
        getContentByCurrentMode,
        updateBrokerMetadata,
        updateAllBrokerMetadata,
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