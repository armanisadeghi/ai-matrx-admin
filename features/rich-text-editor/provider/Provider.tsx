import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { BrokerMetaData, ContentMode, EditorState, LayoutMetadata } from '../types/editor.types';
import { EditorLayout, useEditorLayout } from './hooks/useEditorLayout';
import { ColorManagement, useColorManagement } from '../hooks/useColorManagement';
import { DisplayMode, transformMatrxText, getProcessedMetadataFromText } from '../utils/patternUtils';
import { ProviderChipsHook, useProviderChips } from './hooks/useProviderChips';

export type EditorStates = Map<string, EditorState>;

export interface EditorContextValue {
    registerEditor: (editorId: string, initialContent?: string, initialLayout?: LayoutMetadata) => void;
    unregisterEditor: (editorId: string) => void;
    isEditorRegistered: (editorId: string) => boolean;
    setContent: (editorId: string, content: string) => void;
    getContent: (editorId: string) => string;
    getContentMode: (editorId: string) => ContentMode;
    setContentMode: (editorId: string, contentMode: ContentMode) => void;
    getBrokerMetadata: (editorId: string) => BrokerMetaData[];
    getEditorState: (editorId: string) => EditorState;
    getAllEditorStates: () => { [key: string]: EditorState };
    getTextWithChipsReplaced: (editorId: string) => string;
    getContentByMode: (editorId: string, mode: ContentMode) => string;
    getContentByCurrentMode: (editorId: string) => string;
    updateBrokerMetadata: (editorId: string) => void;
    updateAllBrokerMetadata: () => void;
    messagesLoading: boolean;
    getContentWithIds: (editorId: string) => string;
    setMessagesLoading: (loading: boolean) => void;
    layout: EditorLayout;
    colors: ColorManagement;
    chips: ProviderChipsHook;
}

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

export const getDisplayMode = (contentMode: ContentMode): DisplayMode => {
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
    const registeredEditors = useRef(new Set<string>());
    const colors = useColorManagement();
    const layout = useEditorLayout(editors, setEditors);

    const registerEditor = useCallback((editorId: string, initialContent = '', initialLayout?: LayoutMetadata) => {
        if (registeredEditors.current.has(editorId)) return;

        registeredEditors.current.add(editorId);
        setEditors((prev) => {
            const next = new Map(prev);
            const state: EditorState = {
                ...initialState,
                content: initialContent,
                metadata: getProcessedMetadataFromText(initialContent),
                layout: initialLayout || initialState.layout,
            };
            next.set(editorId, state);
            return next;
        });
    }, []);

    const getEditorState = useCallback(
        (editorId: string) => {
            if (!registeredEditors.current.has(editorId)) {
                throw new Error(`Attempting to access unregistered editor: ${editorId}`);
            }
            const state = editors.get(editorId);
            if (!state) {
                throw new Error(`Editor state not found for registered editor: ${editorId}`);
            }
            return state;
        },
        [editors]
    );

    const unregisterEditor = useCallback((editorId: string) => {
        if (!registeredEditors.current.has(editorId)) return;

        registeredEditors.current.delete(editorId);
        setEditors((prev) => {
            const next = new Map(prev);
            next.delete(editorId);
            return next;
        });
    }, []);

    const isEditorRegistered = useCallback((editorId: string) => registeredEditors.current.has(editorId), []);

    const updateEditorState = useCallback((editorId: string, updates: Partial<EditorState>) => {
        if (!registeredEditors.current.has(editorId)) return;

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
            if (!registeredEditors.current.has(editorId)) return;

            const currentState = getEditorState(editorId);
            const processedMetadata = processContentAndUpdateMetadata(currentState.content);
            updateEditorState(editorId, { metadata: processedMetadata });
        },
        [getEditorState, updateEditorState, processContentAndUpdateMetadata]
    );

    const updateAllBrokerMetadata = useCallback(() => {
        editors.forEach((_, editorId) => {
            if (registeredEditors.current.has(editorId)) {
                updateBrokerMetadata(editorId);
            }
        });
    }, [editors, updateBrokerMetadata]);

    const chips = useProviderChips(editors, messagesLoading, setEditors, getEditorState, updateEditorState, colors);

    const getAllEditorStates = useCallback(() => {
        const editorStatesObject: { [key: string]: EditorState } = {};
        editors.forEach((state, editorId) => {
            if (registeredEditors.current.has(editorId)) {
                editorStatesObject[editorId] = state;
            }
        });
        return editorStatesObject;
    }, [editors]);

    const getContent = useCallback((editorId: string) => getEditorState(editorId).content, [getEditorState]);

    const getBrokerMetadata = useCallback((editorId: string) => getEditorState(editorId).metadata, [getEditorState]);

    const setContent = useCallback(
        (editorId: string, content: string) => {
            if (!registeredEditors.current.has(editorId)) return;

            const processedMetadata = processContentAndUpdateMetadata(content);
            updateEditorState(editorId, {
                content,
                metadata: processedMetadata,
            });
        },
        [updateEditorState, processContentAndUpdateMetadata]
    );

    const getContentMode = useCallback((editorId: string): ContentMode => getEditorState(editorId).contentMode, [getEditorState]);

    const setContentMode = useCallback(
        (editorId: string, contentMode: ContentMode) => {
            if (!registeredEditors.current.has(editorId)) return;
            updateEditorState(editorId, { contentMode });
        },
        [updateEditorState]
    );

    const getContentByMode = useCallback(
        (editorId: string, mode: ContentMode): string => {
            const state = getEditorState(editorId);
            const displayMode = getDisplayMode(mode);
            return transformMatrxText(state.content, displayMode);
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

    const getTextWithChipsReplaced = useCallback(
        (editorId: string): string => {
            const state = getEditorState(editorId);
            return transformMatrxText(state.content, DisplayMode.ENCODED);
        },
        [getEditorState]
    );

    const getContentWithIds = useCallback(
        (editorId: string): string => {
            const state = getEditorState(editorId);
            return transformMatrxText(state.content, DisplayMode.RECORD_KEY);
        },
        [getEditorState]
    );

    
    const value: EditorContextValue = {
        registerEditor,
        unregisterEditor,
        isEditorRegistered,
        layout,
        colors,
        chips,
        getEditorState,
        getAllEditorStates,
        getContent,
        setContent,
        getBrokerMetadata,
        getContentMode,
        setContentMode,
        getTextWithChipsReplaced,
        getContentByMode,
        getContentByCurrentMode,
        updateBrokerMetadata,
        updateAllBrokerMetadata,
        messagesLoading,
        setMessagesLoading,
        getContentWithIds,
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
