
// slices/brokerSlice.ts

import { MatrxRecordId } from "../../entity/types/stateTypes";
import { RootState } from "../../store";
import { BrokerLocalState } from "./broker-state";
import { createShadowSlice } from "./createShadowSlice";


// @ts-ignore - COMPLEX: BrokerLocalState doesn't satisfy Record<string, unknown> constraint - requires type refactor
const brokerSlice = createShadowSlice<'broker', BrokerLocalState>('broker', {
    initialLocalState: {
      linkedEditors: {},
      isConnected: false,
      componentType: 'input',
      color: {
        light: 'bg-blue-100',
        dark: 'dark:bg-blue-900'
      }
    }
  });

// Selector to get broker entity data
const selectBrokerEntity = (state: RootState, brokerId: MatrxRecordId) => {
  // @ts-ignore - broker entity selector not yet fully implemented
  return state.broker?.records?.[brokerId] || null;
};

export default brokerSlice;
  
// Create combined selectors that merge entity and local state
export const selectBrokerComplete = (state: RootState, brokerId: MatrxRecordId) => {
  const entityData = selectBrokerEntity(state, brokerId);
  // @ts-ignore - COMPLEX: Property 'brokerShadow' does not exist on RootState - requires state structure refactor
  const localData = state.brokerShadow?.localState?.[brokerId];
  
  if (!entityData) return null;
  
  return {
    ...entityData,
    ...localData
  };
};