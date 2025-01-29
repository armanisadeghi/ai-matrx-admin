// // hooks/useEditorChips.ts
// import { useCallback } from 'react';
// import { v4 as uuidv4 } from 'uuid';
// import { ChipData, ChipRequestOptions, EditorState, BrokerMetaData } from '../../types/editor.types';
// import { generateChipLabel } from '../../utils/generateBrokerName';
// import { chipSyncManager } from '../../utils/ChipUpdater';
// import { DataBrokerData, MatrxRecordId, MessageBrokerData } from '@/types';
// import { RelationshipCreateResult, useRelationshipDirectCreate } from '@/app/entities/hooks/crud/useDirectRelCreate';
// import { useAppDispatch, useEntityTools } from '@/lib/redux';
// import { EditorStates } from '../provider';

// export const sanitizeId = (id?: string): string | undefined => {
//     if (!id) return id;

//     const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
//     const match = id.match(uuidRegex);
//     return match ? match[0] : id;
// };

// export const makeBrokerMetadata = (requestOptions: ChipRequestOptions = {}, nextColor: string): BrokerMetaData => {
//     const sanitizedId = sanitizeId(requestOptions.id);
//     return {
//         id: sanitizedId ?? uuidv4(),
//         name: requestOptions.name ?? generateChipLabel(requestOptions.defaultValue ?? ''),
//         defaultValue: requestOptions.defaultValue ?? '',
//         color: nextColor,
//         matrxRecordId: requestOptions.brokerId ?? `id:${sanitizeId(requestOptions.id)}`,
//         defaultComponent: requestOptions.defaultComponent,
//         dataType: requestOptions.dataType ?? 'str',
//     };
// };

// export const brokerFromMetadata = (metadata: BrokerMetaData): DataBrokerData => ({
//     id: sanitizeId(metadata.id),
//     name: metadata.name || 'New Broker',
//     defaultValue: metadata.defaultValue || '',
//     color: metadata.color as DataBrokerData['color'],
//     defaultComponent: metadata.defaultComponent || '',
//     dataType: metadata.dataType as DataBrokerData['dataType'],
// });

// const processReturnResults = (results: RelationshipCreateResult[], nextColor: string) => {
//     const brokerRecord = results[0].childRecord.data as DataBrokerData;
//     const messageBrokerRecord = results[0].joinRecord.data as MessageBrokerData;
//     const matrxRecordId = results[0].childMatrxRecordId;

//     const brokerMetadata = {
//         id: brokerRecord.id,
//         name: brokerRecord.name,
//         defaultValue: brokerRecord.defaultValue || brokerRecord.name,
//         color: brokerRecord.color || nextColor,
//         matrxRecordId,
//         defaultComponent: brokerRecord.defaultComponent || '',
//         dataType: brokerRecord.dataType || 'str',
//         status: 'active',
//     };

//     return { matrxRecordId, brokerMetadata, messageBrokerRecord };
// };

// // editors, updateEditorsState, getEditorState, updateEditorState, getNextColor, releaseColor

// export const useProviderChips = (
//     editors: EditorStates,
//     getEditorState: (editorId: string) => EditorState,
//     updateEditorState: (editorId: string, updates: Partial<EditorState>) => void,
//     getNextColor: () => string,
//     releaseColor: (color: string) => void
// ) => {
//     const dispatch = useAppDispatch();
//     const createRelatedRecords = useRelationshipDirectCreate('messageBroker', 'dataBroker');
//     const { actions } = useEntityTools('dataBroker');

//     const handleError = useCallback((error: Error) => {
//         console.error('Failed to create related records:', error);
//     }, []);

//     const createNewChipData = useCallback(
//         async (
//             editorId: string,
//             requestOptions: ChipRequestOptions = {}
//         ): Promise<{ matrxRecordId: MatrxRecordId; brokerMetadata: BrokerMetaData; messageBrokerRecord: MessageBrokerData }> => {
//             const nextColor = getNextColor();
//             const initialBrokerMetadata = makeBrokerMetadata(requestOptions, nextColor);
//             const brokerData = brokerFromMetadata(initialBrokerMetadata);

//             try {
//                 const result = await createRelatedRecords({
//                     parentId: sanitizeId(editorId),
//                     child: brokerData,
//                     joining: {
//                         defaultValue: brokerData.defaultValue,
//                         messageId: editorId,
//                     },
//                 });

//                 if (!result) {
//                     throw new Error('Failed to create related records: No result returned');
//                 }

//                 const { matrxRecordId, brokerMetadata, messageBrokerRecord } = processReturnResults([result], nextColor);

//                 dispatch(actions.addToSelection(matrxRecordId));

//                 addBrokerMetadata(editorId, brokerMetadata);
//                 addChipDataFromMetadata(editorId, brokerMetadata);
//                 return { matrxRecordId, brokerMetadata, messageBrokerRecord };
//             } catch (error) {
//                 handleError(error as Error);
//                 throw error;
//             }
//         },
//         [createRelatedRecords, makeBrokerMetadata, brokerFromMetadata, handleError]
//     );

//     const generateLabel = useCallback(
//         (editorId: string, requestOptions: ChipRequestOptions = {}): string => {
//             const content = requestOptions.defaultValue ?? '';
//             return generateChipLabel(content);
//         },
//         [getEditorState]
//     );

//     const setChipData = useCallback(
//         (editorId: string, data: ChipData[]) => {
//             updateEditorState(editorId, { chipData: data });
//         },
//         [updateEditorState]
//     );

//     // Used Exclusiely by the Editor to crate a new chip
//     const addChipData = useCallback((editorId: string, data: ChipData) => {
//         updateEditorState(editorId, { chipData: [...getEditorState(editorId).chipData, data] });
//     }, []);

//     const addBrokerMetadata = useCallback((editorId: string, data: BrokerMetaData) => {
//         updateEditorState(editorId, { metadata: [...getEditorState(editorId).metadata, data] });
//     }, []);

//     const addChipDataFromMetadata = useCallback(
//         (editorId: string, metadata: BrokerMetaData) => {
//             const chipData: ChipData = {
//                 id: metadata.matrxRecordId,
//                 label: metadata.name,
//                 color: metadata.color,
//                 brokerId: metadata.matrxRecordId,
//             };
//             addChipData(editorId, chipData);
//         },
//         [addChipData]
//     );

//     const removeChipData = useCallback(
//         (editorId: string, chipId: string) => {
//             const currentState = getEditorState(editorId);
//             const chip = currentState.chipData.find((c) => c.id === chipId);

//             if (chip) {
//                 releaseColor(chip.color);
//             }

//             updateEditorState(editorId, {
//                 chipData: currentState.chipData.filter((chip) => chip.id !== chipId),
//             });

//             chipSyncManager.deleteChip(editorId, chipId);
//         },
//         [getEditorState, updateEditorState, releaseColor]
//     );

//     const updateChipData = useCallback(
//         (chipId: string, updates: Partial<ChipData>) => {
//             editors.forEach((state, editorId) => {
//                 const chip = state.chipData.find((c) => c.id === chipId);
//                 if (chip) {
//                     if (updates.color && updates.color !== chip.color) {
//                         releaseColor(chip.color);
//                     }

//                     updateEditorState(editorId, {
//                         chipData: state.chipData.map((c) => (c.id === chipId ? { ...c, ...updates } : c)),
//                     });

//                     chipSyncManager.syncStateToDOM(editorId, chipId, updates);
//                 }
//             });
//         },
//         [editors, updateEditorState, releaseColor]
//     );

//     const syncChipToBroker = useCallback(
//         async (chipId: string, brokerId: MatrxRecordId) => {
//             return new Promise<void>((resolve) => {
//                 const observer = new MutationObserver((mutations, obs) => {
//                     obs.disconnect();
//                     resolve();
//                 });

//                 observer.observe(document.body, {
//                     childList: true,
//                     subtree: true,
//                     attributes: true,
//                     attributeFilter: ['data-chip-id', 'data-broker-id'],
//                 });

//                 editors.forEach((state, editorId) => {
//                     const chipIndex = state.chipData.findIndex((chip) => chip.id === chipId);
//                     if (chipIndex !== -1) {
//                         const updatedChipData = [...state.chipData];
//                         updatedChipData[chipIndex] = {
//                             ...updatedChipData[chipIndex],
//                             id: brokerId,
//                             brokerId: brokerId,
//                         };

//                         updateEditorState(editorId, {
//                             chipData: updatedChipData,
//                         });

//                         chipSyncManager.syncStateToDOM(editorId, chipId, {
//                             id: brokerId,
//                             brokerId: brokerId,
//                         });
//                     }
//                 });

//                 setTimeout(() => {
//                     observer.disconnect();
//                     resolve();
//                 }, 1000);
//             });
//         },
//         [editors, updateEditorState]
//     );

//     const getAllChipData = useCallback(() => {
//         const allChips: Array<ChipData> = [];
//         Object.entries(editors).forEach(([editorId, state]) => {
//             state.chipData.forEach((chip) => {
//                 allChips.push({ ...chip, editorId });
//             });
//         });
//         return allChips;
//     }, [editors]);

//     const getChipsForBroker = useCallback(
//         (searchId: string) => {
//             const normalizedId = searchId.startsWith('id:') ? searchId.slice(3) : searchId;

//             const allChips: Array<ChipData> = [];
//             Object.values(editors).forEach((state) => {
//                 const matchingChips = state.chipData.filter((chip) => chip.brokerId === normalizedId);
//                 allChips.push(...matchingChips);
//             });
//             return allChips;
//         },
//         [editors]
//     );

//     return {
//         getAllChipData,
//         getChipsForBroker,
//         setChipData,
//         createNewChipData,
//         generateLabel,
//         addChipData,
//         removeChipData,
//         updateChipData,
//         syncChipToBroker,
//     };
// };

// export type ProviderChipsHook = ReturnType<typeof useProviderChips>;
