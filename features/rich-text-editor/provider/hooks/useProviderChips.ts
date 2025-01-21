// hooks/useEditorChips.ts
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChipData, ChipRequestOptions, EditorState } from '../../types/editor.types';
import { generateChipLabel } from '../../utils/generateBrokerName';
import { EditorStates } from '../EditorProvider';
import { chipSyncManager } from '../../utils/ChipUpdater';
import { MatrxRecordId } from '@/types';
import { ColorManagement } from '../../hooks/useColorManagement';

export const useProviderChips = (
    editors: EditorStates,
    messagesLoading: boolean,
    setEditors: (updater: (prev: EditorStates) => EditorStates) => void,
    getEditorState: (editorId: string) => EditorState,
    updateEditorState: (editorId: string, updates: Partial<EditorState>) => void,
    colors: ColorManagement
) => {
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

    const setChipData = useCallback(
        (editorId: string, data: ChipData[]) => {
            updateEditorState(editorId, { chipData: data });
        },
        [updateEditorState]
    );

    const createNewChipData = useCallback(
        (editorId: string, requestOptions: ChipRequestOptions = {}): ChipData => {
            const editorState = getEditorState(editorId);
            return {
                id: requestOptions.id ?? uuidv4(),
                label:
                    requestOptions.label ??
                    generateChipLabel({
                        chipData: editorState.chipData,
                        requestOptions,
                    }),
                stringValue: requestOptions.stringValue ?? '',
                color: requestOptions.color ?? colors.getNextColor(),
                brokerId: requestOptions.brokerId ?? 'disconnected',
            };
        },
        [getEditorState, colors]
    );

    // Used Exclusiely by the Editor to crate a new chip
    const addChipData = useCallback((editorId: string, data: ChipData) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, {
                ...current,
                chipData: [...current.chipData, data],
            });
            return next;
        });
    }, []);

    const removeChipData = useCallback(
        (editorId: string, chipId: string) => {
            setEditors((prev) => {
                const current = prev.get(editorId);
                if (!current) return prev;

                const chip = current.chipData.find((c) => c.id === chipId);
                if (chip) {
                    colors.releaseColor(chip.color);
                }

                const next = new Map(prev);
                next.set(editorId, {
                    ...current,
                    chipData: current.chipData.filter((chip) => chip.id !== chipId),
                });
                return next;
            });

            chipSyncManager.deleteChip(editorId, chipId);
        },
        [colors]
    );

    const updateChipData = useCallback(
        (chipId: string, updates: Partial<ChipData>) => {
            setEditors((prev) => {
                const next = new Map(prev);

                prev.forEach((state, editorId) => {
                    const chip = state.chipData.find((c) => c.id === chipId);
                    if (chip) {
                        // If color is being updated, handle color management
                        if (updates.color && updates.color !== chip.color) {
                            colors.releaseColor(chip.color);
                        }

                        const updatedState = {
                            ...state,
                            chipData: state.chipData.map((c) => (c.id === chipId ? { ...c, ...updates } : c)),
                        };
                        next.set(editorId, updatedState);
                        chipSyncManager.syncStateToDOM(editorId, chipId, updates);
                    }
                });

                return next;
            });
        },
        [colors]
    );

    const syncChipToBroker = useCallback(async (chipId: string, brokerId: MatrxRecordId) => {
        return new Promise<void>((resolve) => {
            const observer = new MutationObserver((mutations, obs) => {
                obs.disconnect();
                resolve();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['data-chip-id', 'data-broker-id'],
            });

            setEditors((prev) => {
                const next = new Map(prev);
                prev.forEach((state, editorId) => {
                    const chipIndex = state.chipData.findIndex((chip) => chip.id === chipId);
                    if (chipIndex !== -1) {
                        const updatedChipData = [...state.chipData];
                        updatedChipData[chipIndex] = {
                            ...updatedChipData[chipIndex],
                            id: brokerId,
                            brokerId: brokerId,
                        };

                        const updatedState = {
                            ...state,
                            chipData: updatedChipData,
                        };
                        next.set(editorId, updatedState);

                        chipSyncManager.syncStateToDOM(editorId, chipId, {
                            id: brokerId,
                            brokerId: brokerId,
                        });
                    }
                });
                return next;
            });

            setTimeout(() => {
                observer.disconnect();
                resolve();
            }, 1000);
        });
    }, []);

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

    return {
        getAllChipData,
        getChipsForBroker,
        setChipData,
        createNewChipData,
        generateLabel,
        addChipData,
        removeChipData,
        updateChipData,
        syncChipToBroker,
    };
};

export type ProviderChipsHook = ReturnType<typeof useProviderChips>;
