// EditorProvider.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ColorOption, ChipData, ChipRequestOptions } from '../types/editor.types';
import { generateChipLabel } from '../utils/generateBrokerName';
import { getAllColorOptions, getNextAvailableColor } from '../utils/colorUitls';
import { v4 as uuidv4 } from 'uuid';
import { replaceChipsWithStringValues } from '../utils/editorStateUtils';
import { chipSyncManager } from '../utils/ChipUpdater';
import { useEditorLayout } from './hooks/useEditorLayout';
import { useEditorRegistration } from './hooks/useEditorRegistration';
import { MatrxRecordId } from '@/types';

export interface LayoutMetadata {
    position: string | number;
    type?: string;
    isVisible: boolean;
}

export interface EditorState {
    chipCounter: number;
    draggedChip: HTMLElement | null;
    plainTextContent: string;
    chipData: ChipData[];
    colorAssignments: Map<string, string>;
    layout?: LayoutMetadata;
}

export type EditorStates = Map<string, EditorState>;

export interface EditorContextValue {
    // State getters
    getEditorState: (editorId: string) => EditorState;
    getAllEditorStates: () => { [key: string]: EditorState };
    // State operations
    registerEditor: (editorId: string) => void;
    unregisterEditor: (editorId: string) => void;
    isEditorRegistered: (editorId: string) => boolean; // New method

    // Editor-specific operations
    plainTextContent: (editorId: string) => string;
    setPlainTextContent: (editorId: string, content: string) => void;

    // Chip operations
    getAllChipData: () => ChipData[];
    getChipsForBroker: (searchId: string) => ChipData[];
    setChipCounter: (editorId: string, value: number) => void;
    incrementChipCounter: (editorId: string) => void;
    decrementChipCounter: (editorId: string) => void;
    setDraggedChip: (editorId: string, chip: HTMLElement | null) => void;
    setChipData: (editorId: string, data: ChipData[]) => void;
    createNewChipData: (editorId: string, requestOptions?: ChipRequestOptions) => ChipData;
    addChipData: (editorId: string, data: ChipData) => void;
    removeChipData: (editorId: string, chipId: string) => void;
    updateChipData: (chipId: string, updates: Partial<ChipData>) => void;
    getTextWithChipsReplaced: (editorId: string, showTokenIds?: boolean) => string;
    generateLabel: (editorId: string, requestOptions?: ChipRequestOptions) => string;

    // Chip Color operations
    getColorForChip: (editorId: string, chipId: string) => string | undefined;
    getColorOptions: () => ColorOption[];
    assignColorToChip: (editorId: string, chipId: string, color: string) => void;
    setColorAssignments: (editorId: string, assignments: Map<string, string>) => void;
    getNextColor: (editorId: string) => string;

    // New layout management methods
    setEditorLayout: (editorId: string, layout: LayoutMetadata) => void;
    updateEditorLayout: (editorId: string, updates: Partial<LayoutMetadata>) => void;
    getEditorLayout: (editorId: string) => LayoutMetadata | undefined;
    getVisibleEditors: () => string[];
    getEditorsByPosition: () => Array<{ id: string; layout: LayoutMetadata }>;
    setEditorVisibility: (editorId: string, isVisible: boolean) => void;
    moveEditor: (fromIndex: number, toIndex: number) => void;
}

export const getInitialEditorState = (): EditorState => ({
    chipCounter: 0,
    draggedChip: null,
    plainTextContent: '',
    chipData: [],
    colorAssignments: new Map(),
});

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [editors, setEditors] = useState<EditorStates>(new Map());
    const { registerEditor, unregisterEditor, isEditorRegistered } = useEditorRegistration(editors, setEditors);

    const { setEditorLayout, updateEditorLayout, getEditorLayout, getVisibleEditors, getEditorsByPosition, setEditorVisibility, moveEditor } = useEditorLayout(
        editors,
        setEditors
    );

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

    const getAllEditorStates = useCallback(() => {
        const editorStatesObject: { [key: string]: EditorState } = {};
        editors.forEach((state, editorId) => {
            editorStatesObject[editorId] = state;
        });
        return editorStatesObject;
    }, [editors]);

    const getAllChipData = useCallback(() => {
        const allChips: Array<ChipData> = [];
        editors.forEach((state) => {
            allChips.push(...state.chipData);
        });
        return allChips;
    }, [editors]);

    const updateEditorState = useCallback((editorId: string, updates: Partial<EditorState>) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, { ...current, ...updates });
            return next;
        });
    }, []);

    // Implement all operations using editorId
    const setChipCounter = useCallback(
        (editorId: string, value: number) => {
            updateEditorState(editorId, { chipCounter: value });
        },
        [updateEditorState]
    );

    const incrementChipCounter = useCallback((editorId: string) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, { ...current, chipCounter: current.chipCounter + 1 });
            return next;
        });
    }, []);

    const decrementChipCounter = useCallback((editorId: string) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, { ...current, chipCounter: current.chipCounter - 1 });
            return next;
        });
    }, []);

    const setDraggedChip = useCallback(
        (editorId: string, chip: HTMLElement | null) => {
            updateEditorState(editorId, { draggedChip: chip });
        },
        [updateEditorState]
    );

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

    const getChipsForBroker = useCallback(
        (searchId: string) => {
            const normalizedId = searchId.startsWith('id:') ? searchId.slice(3) : searchId;

            const allChips: Array<ChipData> = [];
            editors.forEach((state) => {
                const matchingChips = state.chipData.filter((chip) => chip.brokerId === normalizedId);
                allChips.push(...matchingChips);
            });
            return allChips;
        },
        [editors]
    );

    const setChipData = useCallback(
        (editorId: string, data: ChipData[]) => {
            updateEditorState(editorId, { chipData: data });
        },
        [updateEditorState]
    );

    const setColorAssignments = useCallback(
        (editorId: string, assignments: Map<string, string>) => {
            updateEditorState(editorId, { colorAssignments: assignments });
        },
        [updateEditorState]
    );

    const createNewChipData = useCallback(
        (editorId: string, requestOptions: ChipRequestOptions = {}): ChipData => {
            const editorState = getEditorState(editorId);
            const id = requestOptions.id ?? uuidv4();
            const stringValue = requestOptions.stringValue ?? '';
            const label =
                requestOptions.label ??
                generateChipLabel({
                    chipData: editorState.chipData,
                    requestOptions,
                });
            const color = requestOptions.color ?? getNextAvailableColor(editorState.colorAssignments);
            const brokerId = requestOptions.brokerId ?? 'disconnected';

            const newColorAssignments = new Map(editorState.colorAssignments).set(id, color);
            setColorAssignments(editorId, newColorAssignments);

            return {
                id,
                label,
                stringValue,
                color,
                brokerId,
            };
        },
        [getEditorState, setColorAssignments]
    );

    const getColorOptions = useCallback(() => {
        return getAllColorOptions();
    }, []);

    const getNextColor = useCallback(
        (editorId: string): string => {
            const editorState = getEditorState(editorId);
            return getNextAvailableColor(editorState.colorAssignments);
        },
        [getEditorState]
    );

    const generateLabel = useCallback(
        (editorId: string, requestOptions: ChipRequestOptions = {}): string => {
            const editorState = getEditorState(editorId);
            return generateChipLabel({
                chipData: editorState.chipData,
                requestOptions,
            });
        },
        [getEditorState]
    );

    const addChipData = useCallback((editorId: string, data: ChipData) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, {
                ...current,
                chipData: [...current.chipData, data],
                chipCounter: current.chipCounter + 1,
            });
            return next;
        });
    }, []);

    const removeChipData = useCallback((editorId: string, chipId: string) => {
        console.log('Starting removeChipData:', { editorId, chipId });

        setEditors((prev) => {
            const current = prev.get(editorId);
            console.log('Current editor state:', {
                hasEditor: !!current,
                chipCount: current?.chipData?.length,
            });

            if (!current) {
                console.log('No editor found, returning previous state');
                return prev;
            }

            const next = new Map(prev);
            const newColorAssignments = new Map(current.colorAssignments);
            newColorAssignments.delete(chipId);

            const newState = {
                ...current,
                chipData: current.chipData.filter((chip) => chip.id !== chipId),
                colorAssignments: newColorAssignments,
                chipCounter: current.chipCounter - 1,
            };

            next.set(editorId, newState);

            console.log('Updated editor state:', {
                chipCount: newState.chipData.length,
                editorIds: Array.from(next.keys()),
            });

            return next;
        });

        // Sync DOM deletion
        console.log('Attempting DOM sync');
        const deleteResult = chipSyncManager.deleteChip(editorId, chipId);
        console.log('DOM sync result:', deleteResult);

        if (!deleteResult.success) {
            console.error('Failed to delete chip from DOM:', deleteResult.error);
        }
    }, []);

    const updateChipData = useCallback((chipId: string, updates: Partial<ChipData>) => {
        setEditors((prev) => {
            const next = new Map(prev);

            // Update the chip in every editor that has it
            prev.forEach((state, editorId) => {
                const chipIndex = state.chipData.findIndex((chip) => chip.id === chipId);
                if (chipIndex !== -1) {
                    const updatedState = {
                        ...state,
                        chipData: state.chipData.map((chip) => (chip.id === chipId ? { ...chip, ...updates } : chip)),
                    };
                    next.set(editorId, updatedState);

                    // Trigger DOM sync if needed
                    chipSyncManager.syncStateToDOM(editorId, chipId, updates);
                }
            });

            return next;
        });
    }, []);

    const getTextWithChipsReplaced = useCallback(
        (editorId: string, showTokenIds = false): string => {
            const state = getEditorState(editorId);
            return replaceChipsWithStringValues(state, showTokenIds);
        },
        [getEditorState]
    );

    const getColorForChip = useCallback(
        (editorId: string, chipId: string) => {
            const editorState = getEditorState(editorId);
            return editorState.colorAssignments.get(chipId);
        },
        [getEditorState]
    );

    const assignColorToChip = useCallback((editorId: string, chipId: string, color: string) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            const newColorAssignments = new Map(current.colorAssignments);
            newColorAssignments.set(chipId, color);

            next.set(editorId, {
                ...current,
                colorAssignments: newColorAssignments,
            });
            return next;
        });
    }, []);

    const value: EditorContextValue = {
        getEditorState,
        getAllEditorStates,
        registerEditor,
        isEditorRegistered,
        unregisterEditor,
        setChipCounter,
        incrementChipCounter,
        decrementChipCounter,
        setDraggedChip,

        plainTextContent,
        setPlainTextContent,

        getAllChipData,
        getChipsForBroker,
        setChipData,
        setColorAssignments,
        createNewChipData,
        addChipData,
        removeChipData,
        updateChipData,
        getTextWithChipsReplaced,

        getColorForChip,
        assignColorToChip,

        getNextColor,
        getColorOptions,
        generateLabel,

        setEditorLayout,
        updateEditorLayout,
        getEditorLayout,
        getVisibleEditors,
        getEditorsByPosition,
        setEditorVisibility,
        moveEditor,
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

// This might have been a great idea that wasn't finished.
// https://claude.ai/chat/61703be2-4230-4ce9-9f44-5317640ddf5a
