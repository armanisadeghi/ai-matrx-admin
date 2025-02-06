import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { BrokerMetaData, ChipData, ContentMode, EditorState, LayoutMetadata } from '@/types/editor.types';
import { EditorLayout, useEditorLayout } from './useEditorLayout';
import { DisplayMode, transformMatrxText, getAllMetadata } from '@/features/rich-text-editor/utils/patternUtils';
import { ProviderChipsHook, useProviderChips } from './useProviderChips';
import { TAILWIND_COLORS } from '@/constants/rich-text-constants';

export interface EditorContextValue {
    registerEditor: (editorId: string, initialContent?: string, initialLayout?: LayoutMetadata) => void;
    unregisterEditor: (editorId: string) => void;
    isEditorRegistered: (editorId: string) => boolean;
    setEditorInitialized: (editorId: string) => void;
    isEditorInitialized: (editorId: string) => boolean;
    setContent: (editorId: string, content: string) => void;
    getContent: (editorId: string) => string;
    getContentMode: (editorId: string) => ContentMode;
    setContentMode: (editorId: string, contentMode: ContentMode) => void;
    getBrokerMetadata: (editorId: string) => BrokerMetaData[];
    getChipData: (editorId: string) => ChipData[];
    getEditorState: (editorId: string) => EditorState;
    getAllEditorStates: () => { [key: string]: EditorState };
    getEncodedText: (editorId: string) => string;
    getContentByMode: (editorId: string, mode: ContentMode) => string;
    getContentByCurrentMode: (editorId: string) => string;
    updateBrokerMetadata: (editorId: string) => void;
    updateAllBrokerMetadata: () => void;
    messagesLoading: boolean;
    getContentWithIds: (editorId: string) => string;
    setMessagesLoading: (loading: boolean) => void;
    getNextColor: () => string;
    releaseColor: (color: string) => void;
    layout: EditorLayout;
    chips: ProviderChipsHook;
    getAllContentMap: () => Map<string, string>;
    getAllBrokersMap: () => Map<string, BrokerMetaData[]>;
    getAllChipsMap: () => Map<string, ChipData[]>;
    getAllBrokers: () => BrokerMetaData[];
    getAllChips: () => ChipData[];
}

export type EditorStates = Map<string, EditorState>;

const initialState: EditorState = {
    content: '',
    initialized: false,
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
        default:
            return DisplayMode.ENCODED;
    }
};

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [editors, setEditors] = useState<EditorStates>(new Map());
    const [messagesLoading, setMessagesLoading] = useState(false);
    const registeredEditors = useRef(new Set<string>());
    const layout = useEditorLayout(editors, setEditors);
    const [usedColors, setUsedColors] = useState<Set<string>>(new Set());

    const registerEditor = useCallback((editorId: string, initialContent = '', initialLayout?: LayoutMetadata) => {
        if (registeredEditors.current.has(editorId)) return;

        console.log('Initial content:', initialContent);

        registeredEditors.current.add(editorId);
        setEditors((prev) => {
            const next = new Map(prev);
            const state: EditorState = {
                ...initialState,
                content: initialContent,
                metadata: getAllMetadata(initialContent),
                layout: initialLayout || initialState.layout,
            };
            next.set(editorId, state);
            return next;
        });
    }, []);

    const getEditorState = useCallback(
        (editorId: string) => {
            if (!registeredEditors.current.has(editorId)) {
                console.warn(`Editor state not found for unregistered editor: ${editorId}`);
                return initialState;
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

    const setEditorInitialized = useCallback((editorId: string) => {
        if (!registeredEditors.current.has(editorId)) return;

        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, { ...current, initialized: true });
            return next;
        });
    }, []);

    const isEditorInitialized = useCallback((editorId: string) => getEditorState(editorId).initialized, [getEditorState]);

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

    const extractContentMetadata = useCallback((content: string): BrokerMetaData[] => {
        return getAllMetadata(content);
    }, []);

    const updateBrokerMetadata = useCallback(
        (editorId: string) => {
            if (!registeredEditors.current.has(editorId)) return;

            const currentState = getEditorState(editorId);
            const processedMetadata = extractContentMetadata(currentState.content);
            updateEditorState(editorId, { metadata: processedMetadata });
        },
        [getEditorState, updateEditorState, extractContentMetadata]
    );

    const updateAllBrokerMetadata = useCallback(() => {
        editors.forEach((_, editorId) => {
            if (registeredEditors.current.has(editorId)) {
                updateBrokerMetadata(editorId);
            }
        });
    }, [editors, updateBrokerMetadata]);

    const getNextColor = useCallback(() => {
        const availableColors = TAILWIND_COLORS.filter((color) => !usedColors.has(color));
        const randomIndex = Math.floor(Math.random() * (availableColors.length || TAILWIND_COLORS.length));
        const selectedColor = availableColors.length > 0 ? availableColors[randomIndex] : TAILWIND_COLORS[randomIndex];

        setUsedColors((prev) => new Set(prev).add(selectedColor));
        return selectedColor;
    }, [usedColors]);

    const releaseColor = useCallback((color: string) => {
        setUsedColors((prev) => {
            const next = new Set(prev);
            next.delete(color);
            return next;
        });
    }, []);

    const chips = useProviderChips(editors, setEditors, getEditorState, updateEditorState, getNextColor, releaseColor);

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
    const getChipData = useCallback((editorId: string) => getEditorState(editorId).chipData, [getEditorState]);

    const getAllContentMap = useCallback(() => {
        if (editors.size === 0) return new Map<string, string>();

        const contentMap = new Map<string, string>();
        editors.forEach((state, editorId) => {
            if (registeredEditors.current.has(editorId)) {
                contentMap.set(editorId, state.content);
            }
        });
        return contentMap;
    }, [editors]);

    const getAllBrokersMap = useCallback(() => {
        if (editors.size === 0) return new Map<string, BrokerMetaData[]>();

        const metadataMap = new Map<string, BrokerMetaData[]>();
        editors.forEach((state, editorId) => {
            if (registeredEditors.current.has(editorId)) {
                metadataMap.set(editorId, state.metadata);
            }
        });
        return metadataMap;
    }, [editors]);

    const getAllBrokers = useCallback((): BrokerMetaData[] => {
        if (editors.size === 0) return [];

        const metadataMap = getAllBrokersMap();
        if (metadataMap.size === 0) return [];

        const allMetadataArrays = Array.from(metadataMap.values());
        const flatMetadata = allMetadataArrays.flat();
        if (flatMetadata.length === 0) return [];

        const uniqueMetadataMap = new Map(flatMetadata.map((metadata) => [metadata.recordKey, metadata]));

        return Array.from(uniqueMetadataMap.values());
    }, [getAllBrokersMap]);

    const getAllChipsMap = useCallback(() => {
        if (editors.size === 0) return new Map<string, ChipData[]>();

        const chipsMap = new Map<string, ChipData[]>();
        editors.forEach((state, editorId) => {
            if (registeredEditors.current.has(editorId)) {
                chipsMap.set(editorId, state.chipData);
            }
        });
        return chipsMap;
    }, [editors]);

    const getAllChips = useCallback((): ChipData[] => {
        if (editors.size === 0) return [];

        const chipMap = getAllChipsMap();
        if (chipMap.size === 0) return [];

        const allChipsArrays = Array.from(chipMap.values());
        const flatChipsData = allChipsArrays.flat();
        if (flatChipsData.length === 0) return [];

        const uniqueChipsMap = new Map(flatChipsData.map((chips) => [chips.id, chips]));

        return Array.from(uniqueChipsMap.values());
    }, [getAllChipsMap]);

    const setContent = useCallback(
        (editorId: string, content: string) => {
            if (!registeredEditors.current.has(editorId)) return;

            const metadata = extractContentMetadata(content);
            updateEditorState(editorId, {
                content,
                metadata,
            });
        },
        [updateEditorState, extractContentMetadata]
    );

    const getEncodedText = useCallback(
        (editorId: string): string => {
            const state = getEditorState(editorId);
            return transformMatrxText(state.content, DisplayMode.ENCODED);
        },
        [getEditorState]
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
        setEditorInitialized,
        isEditorInitialized,
        layout,
        chips,
        getEditorState,
        getAllEditorStates,
        getContent,
        setContent,
        getBrokerMetadata,
        getChipData,
        getContentMode,
        setContentMode,
        getEncodedText,
        getContentByMode,
        getContentByCurrentMode,
        updateBrokerMetadata,
        updateAllBrokerMetadata,
        messagesLoading,
        setMessagesLoading,
        getContentWithIds,
        getNextColor,
        releaseColor,
        getAllContentMap,
        getAllBrokersMap,
        getAllBrokers,
        getAllChipsMap,
        getAllChips,
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
