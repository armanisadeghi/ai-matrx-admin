// slices/brokerSlice.ts

import { MatrxRecordId } from "../../entity/types/stateTypes";
import { RootState } from "../../store";
import { BrokerLocalState } from "./broker-state";
import { createShadowSlice } from "./createShadowSlice";


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
  
  // Create combined selectors that merge entity and local state
  export const selectBrokerComplete = (state: RootState, brokerId: MatrxRecordId) => {
    const entityData = selectBrokerEntity(state, brokerId);
    const localData = state.brokerShadow.localState[brokerId];
    
    if (!entityData) return null;
    
    return {
      ...entityData,
      ...localData
    };
  };