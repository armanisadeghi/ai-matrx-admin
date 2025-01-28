// // useEditorChips.ts
// import { useCallback, useEffect } from 'react';

// import { MatrxRecordId } from '@/types';
// import { getEditorElement } from '../utils/editorUtils';
// import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
// import { useEditorContext } from '../provider/provider';

// interface QuickReferenceRecord {
//     recordKey: MatrxRecordId;
//     displayValue: string;
//     metadata?: any;
// }

// interface ChipData {
//     id: string;
//     label: string;
//     color?: string;
//     stringValue?: string;
//     brokerId?: MatrxRecordId;
// }
// export const useEditorChips = (editorId: string) => {
//     const entityKey = 'dataBroker';
//     const context = useEditorContext();
//     const { quickReferenceRecords } = useFetchQuickRef(entityKey);

//     useEffect(() => {
//         const editor = getEditorElement(editorId);
//         if (!editor) {
//             console.warn(`Editor element with id ${editorId} not found in DOM`);
//         }
//     }, [editorId]);

//     const editorState = context.getEditorState(editorId);
//     const { chipData, colorAssignments } = editorState;

//     const removeChipData = useCallback(
//         (chipId: string) => {
//             context.removeChipData(editorId, chipId);
//         },
//         [editorId, context]
//     );

//     const updateChip = useCallback(
//         (chipId: string, updates: Partial<ChipData>) => {
//             console.log('==== Updating chip:', chipId, updates);
//             context.updateChipData(chipId, updates);
//         },
//         [context]
//     );

//     const updateBrokerConnection = useCallback(
//         (chipId: string, brokerId: MatrxRecordId) => {
//             console.log('==== Updating broker connection:', chipId, brokerId);
//             if (brokerId) {
//                 updateChip(chipId, {
//                     brokerId,
//                 });
//             }
//         },
//         [quickReferenceRecords, updateChip]
//     );


//     const getBrokerChips = useCallback(
//         (brokerId: MatrxRecordId) => {
//             return chipData.filter((chip) => chip.brokerId === brokerId);
//         },
//         [chipData]
//     );

//     return {
//         chipData,
//         removeChipData,
//         updateChip,
//         getBrokerChips,
//         colorAssignments,
//         updateBrokerConnection,
//     };
// };

// export type UseEditorChipsResult = ReturnType<typeof useEditorChips>;
