// EditorProvider.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ColorOption, ChipData, ChipRequestOptions } from '../types/editor.types';
import { generateChipLabel } from '../utils/generateBrokerName';
import { getAllColorOptions, getNextAvailableColor } from '../utils/colorUitls';
import { v4 as uuidv4 } from 'uuid';
import { replaceChipsWithStringValues } from '../utils/editorStateUtils';
import { chipSyncManager } from '../utils/ChipUpdater';

export interface LayoutMetadata {
    position: string | number; // Generic position identifier (could be order, location, etc)
    type?: string; // Generic type identifier (could be role, purpose, etc)
    isVisible: boolean;
}

export interface EditorState {
    chipCounter: number;
    draggedChip: HTMLElement | null;
    plainTextContent: string;
    chipData: ChipData[];
    colorAssignments: Map<string, string>;
    layout?: LayoutMetadata; // New optional layout field
}

type EditorStates = Map<string, EditorState>;

export interface EditorContextValue {
    // State getters
    getEditorState: (editorId: string) => EditorState;

    // State operations
    registerEditor: (editorId: string) => void;
    unregisterEditor: (editorId: string) => void;
    isEditorRegistered: (editorId: string) => boolean; // New method

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
    getTextWithChipsReplaced: (editorId: string, showTokenIds?: boolean) => string;

    // Color operations
    getColorForChip: (editorId: string, chipId: string) => string | undefined;
    getColorOptions: () => ColorOption[];
    assignColorToChip: (editorId: string, chipId: string, color: string) => void;

    // New layout management methods
    setEditorLayout: (editorId: string, layout: LayoutMetadata) => void;
    updateEditorLayout: (editorId: string, updates: Partial<LayoutMetadata>) => void;
    getEditorLayout: (editorId: string) => LayoutMetadata | undefined;
    getVisibleEditors: () => string[];
    getEditorsByPosition: () => Array<{ id: string; layout: LayoutMetadata }>;
    setEditorVisibility: (editorId: string, isVisible: boolean) => void;
    getNextColor: (editorId: string) => string;
    generateLabel: (editorId: string, requestOptions?: ChipRequestOptions) => string;
}

const getInitialEditorState = (): EditorState => ({
    chipCounter: 0,
    draggedChip: null,
    plainTextContent: '',
    chipData: [],
    colorAssignments: new Map(),
});


const useEditorRegistration = (editors: EditorStates, setEditors: (updater: (prev: EditorStates) => EditorStates) => void) => {
    const registrationRef = useRef(new Set<string>());
    
    const registerEditor = useCallback((editorId: string, initialLayout?: LayoutMetadata) => {
        if (registrationRef.current.has(editorId)) {
            console.log('Skipping duplicate registration:', editorId);
            return;
        }

        console.log('Registering editor:', editorId);
        registrationRef.current.add(editorId);
        
        setEditors(prev => {
            if (prev.has(editorId)) return prev;
            const next = new Map(prev);
            const initialState = getInitialEditorState();
            if (initialLayout) {
                initialState.layout = initialLayout;
            }
            next.set(editorId, initialState);
            return next;
        });
    }, [setEditors]);

    const unregisterEditor = useCallback((editorId: string) => {
        if (!registrationRef.current.has(editorId)) {
            console.log('Skipping unregistration of unknown editor:', editorId);
            return;
        }

        console.log('Unregistering editor:', editorId);
        registrationRef.current.delete(editorId);
        
        setEditors(prev => {
            const next = new Map(prev);
            next.delete(editorId);
            return next;
        });
    }, [setEditors]);

    const isEditorRegistered = useCallback((editorId: string) => {
        return registrationRef.current.has(editorId);
    }, []);

    return {
        registerEditor,
        unregisterEditor,
        isEditorRegistered
    };
};



const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [editors, setEditors] = useState<EditorStates>(new Map());
    const { 
        registerEditor, 
        unregisterEditor, 
        isEditorRegistered 
    } = useEditorRegistration(editors, setEditors);

    // const isEditorRegistered = useCallback((editorId: string) => editors.has(editorId), [editors]);

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

    const setEditorLayout = useCallback((editorId: string, layout: LayoutMetadata) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, { ...current, layout });
            return next;
        });
    }, []);

    const updateEditorLayout = useCallback((editorId: string, updates: Partial<LayoutMetadata>) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current || !current.layout) return prev;

            const next = new Map(prev);
            next.set(editorId, {
                ...current,
                layout: { ...current.layout, ...updates },
            });
            return next;
        });
    }, []);

    const getEditorLayout = useCallback(
        (editorId: string) => {
            return editors.get(editorId)?.layout;
        },
        [editors]
    );

    const getVisibleEditors = useCallback(() => {
        return Array.from(editors.entries())
            .filter(([_, state]) => state.layout?.isVisible)
            .map(([id]) => id);
    }, [editors]);

    const getEditorsByPosition = useCallback(() => {
        return Array.from(editors.entries())
            .filter(([_, state]) => state.layout)
            .map(([id, state]) => ({
                id,
                layout: state.layout!,
            }))
            .sort((a, b) => {
                // Handle different position types
                const posA = a.layout.position;
                const posB = b.layout.position;

                if (typeof posA === 'number' && typeof posB === 'number') {
                    return posA - posB;
                }
                return String(posA).localeCompare(String(posB));
            });
    }, [editors]);

    const setEditorVisibility = useCallback(
        (editorId: string, isVisible: boolean) => {
            updateEditorLayout(editorId, { isVisible });
        },
        [updateEditorLayout]
    );

    // // Enhanced registerEditor to optionally accept initial layout
    // const registerEditor = useCallback((editorId: string, initialLayout?: LayoutMetadata) => {
    //     console.log('Registering editor:', editorId);
    //     setEditors((prev) => {
    //         if (prev.has(editorId)) {
    //             console.log('Editor already registered:', editorId);
    //             return prev;
    //         }
    //         console.log('Creating new editor state for:', editorId);
    //         const next = new Map(prev);
    //         const initialState = getInitialEditorState();
    //         if (initialLayout) {
    //             initialState.layout = initialLayout;
    //         }
    //         next.set(editorId, initialState);
    //         console.log('Current editors after registration:', Array.from(next.keys()));
    //         return next;
    //     });
    // }, []);

    // const unregisterEditor = useCallback((editorId: string) => {
    //     console.log('Unregistering editor:', editorId);
    //     setEditors((prev) => {
    //         const next = new Map(prev);
    //         next.delete(editorId);
    //         console.log('Current editors after unregistration:', Array.from(next.keys()));
    //         return next;
    //     });
    // }, []);

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
        chipSyncManager.syncStateToDOM(editorId, chipId, updates);
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
