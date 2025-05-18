// import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// import { createSelector } from 'reselect';
// import { RootState } from '@/lib/redux';
// import { v4 as uuidv4 } from 'uuid';


// interface FieldOption {
//   id: string; // Typically used for the value of the option.
//   label: string; // Used as the human readable label for the option.
//   description?: string; // This is where the 'context' is stored for the ai model. NOT SHOWN TO THE USER!
//   helpText?: string; // Seen by the user.
//   iconName?: string; // Icon name from lucide-react.
//   parentId?: string; // Used to create a hierarchy of options.
//   metadata?: any; // Used to store any additional data for the option.
// }

// interface FieldOptionsRuntime extends FieldOption {
//   isSelected: boolean; // Used to determine if the option is selected.
//   otherText?: string; // Used to store the text of the other option.
// }



// interface BrokerMapEntry {
//   source: string;
//   sourceId: string;
//   itemId: string;
//   brokerId: string;
// }

// interface DynamicBrokerMapEntry {
//   source: string;
//   sourceId: string;
//   itemId: string;
// }

// interface BrokerState {
//   brokers: { [brokerId: string]: any };
//   brokerMap: { [key: string]: BrokerMapEntry };
// }

// const initialState: BrokerState = {
//   brokers: {},
//   brokerMap: {},
// };

// const brokersSlice = createSlice({
//   name: 'brokers',
//   initialState,
//   reducers: {
//     updateBrokerValue(
//       state,
//       action: PayloadAction<{
//         source?: string;
//         itemId?: string;
//         brokerId?: string;
//         value: any;
//       }>
//     ) {
//       const { source, itemId, brokerId, value } = action.payload;

//       // Determine brokerId
//       let targetBrokerId: string | undefined = brokerId;
//       if (source && itemId) {
//         const mapKey = `${source}:${itemId}`;
//         targetBrokerId = state.brokerMap[mapKey]?.brokerId;
//       }

//       if (!targetBrokerId) {
//         console.warn('No brokerId found for update', { source, itemId, brokerId });
//         return;
//       }

//       // Update broker value
//       state.brokers[targetBrokerId] = value;
//     },
//     setBrokerMap(state, action: PayloadAction<BrokerMapEntry[]>) {
//       const newMap: BrokerState['brokerMap'] = {};
//       action.payload.forEach((entry) => {
//         const key = `${entry.source}:${entry.itemId}`;
//         newMap[key] = entry;
//       });
//       state.brokerMap = newMap;
//     },
//     addDynamicBrokerMap(
//       state,
//       action: PayloadAction<DynamicBrokerMapEntry | DynamicBrokerMapEntry[]>
//     ) {
//       const entries = Array.isArray(action.payload) 
//         ? action.payload 
//         : [action.payload];
        
//       entries.forEach((entry) => {
//         // Generate a new UUID for this mapping
//         const brokerId = uuidv4();
        
//         // Create the map entry
//         const mapEntry: BrokerMapEntry = {
//           source: entry.source,
//           sourceId: entry.sourceId,
//           itemId: entry.itemId,
//           brokerId,
//         };
        
//         // Add to map using standard format
//         const mapKey = `${entry.source}:${entry.itemId}`;
//         state.brokerMap[mapKey] = mapEntry;
//       });
//     },
//     resetMapEntry(
//       state,
//       action: PayloadAction<{ source: string; itemId: string }>
//     ) {
//       const { source, itemId } = action.payload;
//       const mapKey = `${source}:${itemId}`;
//       delete state.brokerMap[mapKey];
//     },
//     resetMapFull(state) {
//       state.brokerMap = {};
//     },
//     resetBrokerValue(
//       state,
//       action: PayloadAction<{
//         source?: string;
//         itemId?: string;
//         brokerId?: string;
//       }>
//     ) {
//       const { source, itemId, brokerId } = action.payload;

//       // Determine brokerId
//       let targetBrokerId: string | undefined = brokerId;
//       if (source && itemId) {
//         const mapKey = `${source}:${itemId}`;
//         targetBrokerId = state.brokerMap[mapKey]?.brokerId;
//       }

//       if (!targetBrokerId) {
//         console.warn('No brokerId found for reset', { source, itemId, brokerId });
//         return;
//       }

//       // Reset broker value to undefined
//       delete state.brokers[targetBrokerId];
//     },
//     resetAllBrokerValues(state) {
//       state.brokers = {};
//     },
//   },
// });

// export const {
//   updateBrokerValue,
//   setBrokerMap,
//   addDynamicBrokerMap,
//   resetMapEntry,
//   resetMapFull,
//   resetBrokerValue,
//   resetAllBrokerValues,
// } = brokersSlice.actions;

// // Selectors
// const selectBrokersState = (state: RootState) => state.brokers;

// export const selectBrokerValue = createSelector(
//   [
//     selectBrokersState,
//     (_: RootState, source: string, itemId: string) => ({ source, itemId }),
//   ],
//   (brokersState, { source, itemId }) => {
//     const mapKey = `${source}:${itemId}`;
//     const brokerId = brokersState.brokerMap[mapKey]?.brokerId;
//     return brokerId ? brokersState.brokers[brokerId] : undefined;
//   }
// );

// export const selectBrokerValueByBrokerId = createSelector(
//   [selectBrokersState, (_: RootState, brokerId: string) => brokerId],
//   (brokersState, brokerId) => brokersState.brokers[brokerId]
// );

// export const selectBrokerId = createSelector(
//   [
//     selectBrokersState,
//     (_: RootState, source: string, itemId: string) => ({ source, itemId }),
//   ],
//   (brokersState, { source, itemId }) => {
//     const mapKey = `${source}:${itemId}`;
//     return brokersState.brokerMap[mapKey]?.brokerId;
//   }
// );

// export const selectMultipleBrokerValues = createSelector(
//   [
//     selectBrokersState,
//     (_: RootState, brokerIds: string[]) => brokerIds,
//   ],
//   (brokersState, brokerIds) => {
//     return brokerIds.reduce<Record<string, any>>((result, brokerId) => {
//       result[brokerId] = brokersState.brokers[brokerId];
//       return result;
//     }, {});
//   }
// );

// export const selectMultipleBrokerValuesArray = createSelector(
//   [
//     selectBrokersState,
//     (_: RootState, brokerIds: string[]) => brokerIds,
//   ],
//   (brokersState, brokerIds) => {
//     return brokerIds.map(brokerId => brokersState.brokers[brokerId]);
//   }
// );

// export default brokersSlice.reducer;