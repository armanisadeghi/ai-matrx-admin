// hooks/useEditorChips.ts
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
    ChipData, 
    ChipRequestOptions, 
    EditorState 
} from '../../types/editor.types';
import { generateChipLabel } from '../../utils/generateBrokerName';
import { EditorStates } from '../EditorProvider';
import { getAllColorOptions, getNextAvailableColor } from '../../utils/colorUitls';
import { chipSyncManager } from '../../utils/ChipUpdater';
import { replaceChipsWithStringValues } from '../../utils/editorStateUtils';
import { MatrxRecordId } from '@/types';

export const useEditorChips = (
    editors: EditorStates,
    setEditors: (updater: (prev: EditorStates) => EditorStates) => void,
    getEditorState: (editorId: string) => EditorState
) => {

    
    const updateEditorState = useCallback((editorId: string, updates: Partial<EditorState>) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, { ...current, ...updates });
            return next;
        });
    }, [setEditors]);

    const getAllChipData = useCallback(() => {
        const allChips: Array<ChipData> = [];
        editors.forEach((state, editorId) => {
            state.chipData.forEach((chip) => {
                allChips.push({ ...chip, editorId });
            });
        });
        return allChips;
    }, [editors]);

    

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
                editorId,
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

    const syncChipToBroker = useCallback((chipId: string, brokerId: MatrxRecordId) => {
        setEditors((prev) => {
            const next = new Map(prev);

            prev.forEach((state, editorId) => {
                const chipIndex = state.chipData.findIndex((chip) => chip.id === chipId);
                if (chipIndex !== -1) {
                    // Create updated chip data with both ID and brokerId changes
                    const updatedChipData = [...state.chipData];
                    updatedChipData[chipIndex] = {
                        ...updatedChipData[chipIndex],
                        id: brokerId, // Update chip ID to match broker
                        brokerId: brokerId, // Set the broker ID reference
                    };

                    const updatedState = {
                        ...state,
                        chipData: updatedChipData,
                    };
                    next.set(editorId, updatedState);

                    // Sync DOM with both ID changes
                    chipSyncManager.syncStateToDOM(editorId, chipId, {
                        id: brokerId,
                        brokerId: brokerId,
                    });
                }
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
    
    
    return {
        // Chip Counter
        setChipCounter,
        incrementChipCounter,
        decrementChipCounter,

        // Chip Data
        setChipData,
        createNewChipData,
        addChipData,
        removeChipData,
        updateChipData,

        // Color Management
        setColorAssignments,
        getColorForChip,
        assignColorToChip,
        getColorOptions,
        getNextColor,

        generateLabel
    };
};

