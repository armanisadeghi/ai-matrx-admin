// import { useCallback, useEffect, useRef } from 'react';
// import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
// import { ChipData } from '@/features/rich-text-editor/types/editor.types';
// import { useAddBroker } from './messages/useAddBroker';
// import { DataBrokerData, MatrxRecordId } from '@/types';
// import { useEntityTools } from '@/lib/redux';

// interface ChipChange {
//     type: 'added' | 'removed' | 'updated';
//     chip: ChipData;
//     previousChip?: ChipData;
// }

// interface UseChipMonitorProps {
//     editorId: MatrxRecordId;
//     onChange?: (changes: ChipChange[]) => void;
// }

// const isChipDisconnected = (chip: ChipData) => {
//     return !chip.brokerId || chip.brokerId === 'disconnected' || chip.brokerId === 'null' || chip.brokerId === 'undefined';
// };

// export const useChipMonitor = ({ editorId, onChange }: UseChipMonitorProps) => {
//     const context = useEditorContext();
//     const { actions: brokerActions, selectors: brokerSelectors, store } = useEntityTools('dataBroker');
//     const previousChipsRef = useRef<ChipData[]>([]);
//     const { addBroker } = useAddBroker(editorId);

//     const handleChipChange = useCallback(
//         (change: ChipChange) => {
//             console.log(`Processing ${change.type} chip:`, change.chip);

//             switch (change.type) {
//                 case 'added': {
//                     if (isChipDisconnected(change.chip)) {
//                         console.log('New disconnected chip detected:', {
//                             chipId: change.chip.id,
//                             label: change.chip.label,
//                             brokerStatus: change.chip.brokerId || 'none',
//                         });

//                         const addBrokerPayload = {
//                             name: change.chip.label,
//                             defaultValue: change.chip.stringValue || change.chip.label || '',
//                             dataType: 'str' as DataBrokerData['dataType'],
//                         };
//                         addBroker(addBrokerPayload);
//                     } else {
//                         console.log('New chip with connected broker:', {
//                             chipId: change.chip.id,
//                             label: change.chip.label,
//                             brokerId: change.chip.brokerId,
//                         });
//                     }
//                     break;
//                 }

//                 case 'updated': {
//                     if (isChipDisconnected(change.chip)) {
//                         console.log('Updated chip is disconnected:', {
//                             chipId: change.chip.id,
//                             label: change.chip.label,
//                             previousBrokerId: change.previousChip?.brokerId || 'none',
//                             currentBrokerId: change.chip.brokerId || 'none',
//                         });

//                         const addBrokerPayload = {
//                             name: change.chip.label,
//                             defaultValue: change.chip.stringValue || '',
//                             dataType: 'str' as DataBrokerData['dataType'],
//                         };
//                         addBroker(addBrokerPayload);
//                     } else {
//                         console.log('Updated chip with connected broker:', {
//                             chipId: change.chip.id,
//                             label: change.chip.label,
//                             previousBrokerId: change.previousChip?.brokerId,
//                             currentBrokerId: change.chip.brokerId,
//                         });
//                     }
//                     break;
//                 }

//                 case 'removed': {
//                     console.log('Removed chip:', {
//                         chipId: change.chip.id,
//                         label: change.chip.label,
//                         wasConnected: !isChipDisconnected(change.chip),
//                         brokerId: change.chip.brokerId,
//                     });
//                     break;
//                 }
//             }
//         },
//         [addBroker]
//     );

//     useEffect(() => {
//         const interval = setInterval(() => {
//             if (!context.isEditorRegistered(editorId)) return;

//             const currentState = context.getEditorState(editorId);
//             const currentChips = currentState.chipData;
//             const previousChips = previousChipsRef.current;

//             const changes: ChipChange[] = [];

//             // Find added chips
//             currentChips.forEach((chip) => {
//                 const previousChip = previousChips.find((p) => p.id === chip.id);
//                 if (!previousChip) {
//                     changes.push({ type: 'added', chip });
//                 } else if (JSON.stringify(previousChip) !== JSON.stringify(chip)) {
//                     changes.push({ type: 'updated', chip, previousChip });
//                 }
//             });

//             // Find removed chips
//             previousChips.forEach((chip) => {
//                 if (!currentChips.find((c) => c.id === chip.id)) {
//                     changes.push({ type: 'removed', chip });
//                 }
//             });

//             // Process each change
//             changes.forEach((change) => {
//                 handleChipChange(change);
//                 onChange?.(changes);
//             });

//             // Update reference for next comparison
//             previousChipsRef.current = currentChips;
//         }, 100);

//         return () => clearInterval(interval);
//     }, [context, editorId, onChange, handleChipChange]);

//     // Return current chip data and helper methods
//     return {
//         getCurrentChips: () => {
//             if (!context.isEditorRegistered(editorId)) return [];
//             return context.getEditorState(editorId).chipData;
//         },
//         getChipById: (chipId: string) => {
//             if (!context.isEditorRegistered(editorId)) return null;
//             return context.getEditorState(editorId).chipData.find((chip) => chip.id === chipId) || null;
//         },
//     };
// };
