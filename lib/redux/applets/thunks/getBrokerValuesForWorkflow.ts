import { AppThunk } from "@/lib/redux/store";
import { brokerValuesSlice } from "../slices/brokerValuesSlice";
import { selectBrokerValues } from "../selectors/appletRuntimeSelectors";

export const getBrokerValuesForWorkflow =
    ({ appId, brokerIds }: { appId: string; brokerIds: string[] }): AppThunk<Record<string, any>> =>
    (dispatch, getState) => {
        dispatch(brokerValuesSlice.actions.addNeededBrokers({ appId, brokerIds }));
        const state = getState();
        const brokerValues = selectBrokerValues(state);
        const result: Record<string, any> = {};

        brokerIds.forEach((brokerId) => {
            const brokerValue = brokerValues[brokerId];
            if (brokerValue) {
                result[brokerId] = brokerValue.value;
            }
        });

        return result;
    };