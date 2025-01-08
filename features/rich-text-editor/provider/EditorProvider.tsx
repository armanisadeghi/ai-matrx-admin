// EditorProvider.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChipData, ChipRequestOptions } from '../types/editor.types';
import { generateChipLabel } from '../utils/generateBrokerName';
import { getNextAvailableColor } from '../utils/colorUitls';
import { v4 as uuidv4 } from 'uuid';

interface EditorState {
    chipCounter: number;
    draggedChip: HTMLElement | null;
    plainTextContent: string;
    chipData: ChipData[];
    colorAssignments: Map<string, string>;
}

type EditorStates = Map<string, EditorState>;

interface EditorContextValue {
    // State getters
    getEditorState: (editorId: string) => EditorState;

    // State operations
    registerEditor: (editorId: string) => void;
    unregisterEditor: (editorId: string) => void;
    isEditorRegistered: (editorId: string) => boolean;  // New method

    // Editor-specific operations
    setChipCounter: (editorId: string, value: number) => void;
    incrementChipCounter: (editorId: string) => void;
    decrementChipCounter: (editorId: string) => void;
    setDraggedChip: (editorId: string, chip: HTMLElement | null) => void;
    setPlainTextContent: (editorId: string, content: string) => void;
    setChipData: (editorId: string, data: ChipData[]) => void;
    setColorAssignments: (editorId: string, assignments: Map<string, string>) => void;

    // Chip operations
    createNewChipData: (editorId: string, requestOptions?: ChipRequestOptions) => ChipData;
    addChipData: (editorId: string, data: ChipData) => void;
    removeChipData: (editorId: string, chipId: string) => void;
    updateChipData: (editorId: string, chipId: string, updates: Partial<ChipData>) => void;

    // Color operations
    getColorForChip: (editorId: string, chipId: string) => string | undefined;
    assignColorToChip: (editorId: string, chipId: string, color: string) => void;
}

const getInitialEditorState = (): EditorState => ({
    chipCounter: 0,
    draggedChip: null,
    plainTextContent: '',
    chipData: [],
    colorAssignments: new Map(),
});

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [editors, setEditors] = useState<EditorStates>(new Map());

    const isEditorRegistered = useCallback(
        (editorId: string) => editors.has(editorId),
        [editors]
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


    const registerEditor = useCallback((editorId: string) => {
        console.log('Registering editor:', editorId);
        setEditors((prev) => {
            if (prev.has(editorId)) {
                console.log('Editor already registered:', editorId);
                return prev;
            }
            console.log('Creating new editor state for:', editorId);
            const next = new Map(prev);
            next.set(editorId, getInitialEditorState());
            console.log('Current editors after registration:', Array.from(next.keys()));
            return next;
        });
    }, []);

    const unregisterEditor = useCallback((editorId: string) => {
        console.log('Unregistering editor:', editorId);
        setEditors((prev) => {
            const next = new Map(prev);
            next.delete(editorId);
            console.log('Current editors after unregistration:', Array.from(next.keys()));
            return next;
        });
    }, []);

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

    const setPlainTextContent = useCallback(
        (editorId: string, content: string) => {
            updateEditorState(editorId, { plainTextContent: content });
        },
        [updateEditorState]
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
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            const newColorAssignments = new Map(current.colorAssignments);
            newColorAssignments.delete(chipId);

            next.set(editorId, {
                ...current,
                chipData: current.chipData.filter((chip) => chip.id !== chipId),
                colorAssignments: newColorAssignments,
            });
            return next;
        });
    }, []);

    const updateChipData = useCallback((editorId: string, chipId: string, updates: Partial<ChipData>) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, {
                ...current,
                chipData: current.chipData.map((chip) => (chip.id === chipId ? { ...chip, ...updates } : chip)),
            });
            return next;
        });
    }, []);

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
        registerEditor,
        isEditorRegistered,
        unregisterEditor,
        setChipCounter,
        incrementChipCounter,
        decrementChipCounter,
        setDraggedChip,
        setPlainTextContent,
        setChipData,
        setColorAssignments,
        createNewChipData,
        addChipData,
        removeChipData,
        updateChipData,
        getColorForChip,
        assignColorToChip,
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
