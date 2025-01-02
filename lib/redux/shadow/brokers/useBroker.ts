// hooks/useBroker.ts

import { MatrxRecordId } from "../../entity/types/stateTypes";
import brokerSlice from "../../features/broker/brokerSlice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { BrokerLocalState } from "./broker-state";
import { selectBrokerComplete } from "./brokerSlice";


export const useBroker = (brokerId: MatrxRecordId) => {
    const broker = useAppSelector(state => selectBrokerComplete(state, brokerId));
    const dispatch = useAppDispatch();
    
    return {
      ...broker,
      updateLocalState: (data: Partial<BrokerLocalState>) => {
        dispatch(brokerSlice.actions.updateLocalState({ recordId: brokerId, data }));
      }
    };
  };