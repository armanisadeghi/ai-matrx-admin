// hooks/useEditorChips.ts
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChipData, ChipRequestOptions, EditorState, BrokerMetaData } from '../../types/editor.types';
import { generateChipLabel } from '../../utils/generateBrokerName';
import { chipSyncManager } from '../../utils/ChipUpdater';
import { DataBrokerData, MatrxRecordId, MessageBrokerData } from '@/types';
import { ColorManagement } from '../../hooks/useColorManagement';
import { EditorStates } from '../provider';
import { RelationshipCreateResult, useRelationshipDirectCreate } from '@/app/entities/hooks/crud/useDirectRelCreate';
import { getRandomColor } from '../../utils/colorUitls';
import { useAppDispatch, useEntityTools } from '@/lib/redux';

export const sanitizeId = (id?: string): string | undefined => {
    if (!id) return id;

    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    const match = id.match(uuidRegex);
    return match ? match[0] : id;
};

export const makeBrokerMetadata = (requestOptions: ChipRequestOptions = {}): BrokerMetaData => {
    const sanitizedId = sanitizeId(requestOptions.id);
    return {
        id: sanitizedId ?? uuidv4(),
        name: requestOptions.name ?? generateChipLabel(requestOptions.defaultValue ?? ''),
        defaultValue: requestOptions.defaultValue ?? '',
        color: requestOptions.color ?? getRandomColor(),
        matrxRecordId: requestOptions.brokerId ?? `id:${sanitizeId(requestOptions.id)}`,
        defaultComponent: requestOptions.defaultComponent,
        dataType: requestOptions.dataType ?? 'str',
    };
};

export const brokerFromMetadata = (metadata: BrokerMetaData): DataBrokerData => ({
    id: sanitizeId(metadata.id),
    name: metadata.name || 'New Broker',
    defaultValue: metadata.defaultValue || '',
    color: metadata.color as DataBrokerData['color'],
    defaultComponent: metadata.defaultComponent || '',
    dataType: metadata.dataType as DataBrokerData['dataType'],
});

const processReturnResults = (results: RelationshipCreateResult[]) => {
    const brokerRecord = results[0].childRecord.data as DataBrokerData;
    const messageBrokerRecord = results[0].joinRecord.data as MessageBrokerData;
    const matrxRecordId = results[0].childMatrxRecordId;
    
    const brokerMetadata = {
        id: brokerRecord.id,
        name: brokerRecord.name,
        defaultValue: brokerRecord.defaultValue || brokerRecord.name,
        color: brokerRecord.color || getRandomColor(),
        matrxRecordId,
        defaultComponent: brokerRecord.defaultComponent || '',
        dataType: brokerRecord.dataType || 'str',
        status: 'active',
    };

    return { matrxRecordId, brokerMetadata, messageBrokerRecord };
};

export const useProviderChips = (
    editors: EditorStates,
    messagesLoading: boolean,
    setEditors: (updater: (prev: EditorStates) => EditorStates) => void,
    getEditorState: (editorId: string) => EditorState,
    updateEditorState: (editorId: string, updates: Partial<EditorState>) => void,
    colors: ColorManagement
) => {
    const dispatch = useAppDispatch();
    const createRelatedRecords = useRelationshipDirectCreate('messageBroker', 'dataBroker');
    const { actions } = useEntityTools('dataBroker');

    const handleError = useCallback((error: Error) => {
        console.error('Failed to create related records:', error);
    }, []);

    const createNewChipData = useCallback(
        async (
            editorId: string,
            requestOptions: ChipRequestOptions = {}
        ): Promise<{ matrxRecordId: MatrxRecordId; brokerMetadata: BrokerMetaData; messageBrokerRecord: MessageBrokerData }> => {

            const initialBrokerMetadata = makeBrokerMetadata(requestOptions);
            const brokerData = brokerFromMetadata(initialBrokerMetadata);

            try {
                const result = await createRelatedRecords({
                    parentId: sanitizeId(editorId),
                    child: brokerData,
                    joining: {
                        defaultValue: brokerData.defaultValue,
                        messageId: editorId,
                    },
                });

                if (!result) {
                    throw new Error('Failed to create related records: No result returned');
                }

                const { matrxRecordId, brokerMetadata, messageBrokerRecord } = processReturnResults([result]);

                dispatch(actions.addToSelection(matrxRecordId));

                addBrokerMetadata(editorId, brokerMetadata);
                addChipDataFromMetadata(editorId, brokerMetadata);
                return { matrxRecordId, brokerMetadata, messageBrokerRecord };
            } catch (error) {
                handleError(error as Error);
                throw error;
            }
        },
        [createRelatedRecords, makeBrokerMetadata, brokerFromMetadata, handleError]
    );

    const generateLabel = useCallback(
        (editorId: string, requestOptions: ChipRequestOptions = {}): string => {
            const content = requestOptions.defaultValue ?? '';
            return generateChipLabel(content);
        },
        [getEditorState]
    );

    const setChipData = useCallback(
        (editorId: string, data: ChipData[]) => {
            updateEditorState(editorId, { chipData: data });
        },
        [updateEditorState]
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

    const addBrokerMetadata = useCallback((editorId: string, data: BrokerMetaData) => {
        setEditors((prev) => {
            const current = prev.get(editorId);
            if (!current) return prev;

            const next = new Map(prev);
            next.set(editorId, {
                ...current,
                metadata: [...current.metadata, data],
            });
            return next;
        });
    }, []);

    const addChipDataFromMetadata = useCallback(
        (editorId: string, metadata: BrokerMetaData) => {
            const chipData: ChipData = {
                id: metadata.matrxRecordId,
                label: metadata.name,
                color: metadata.color,
                brokerId: metadata.matrxRecordId,
            };
            addChipData(editorId, chipData);
        },
        [addChipData]
    );

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
