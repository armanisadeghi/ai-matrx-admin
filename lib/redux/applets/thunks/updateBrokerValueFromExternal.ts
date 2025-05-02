import { AppThunk } from "@/lib/redux/store";
import { brokerValuesSlice } from "../slices/brokerValuesSlice";
import { selectBrokerValues } from "../selectors/appletSelectors";

export const updateBrokerValueFromExternal =
    ({ appId, brokerId, value, source, metadata = {} }: { appId: string; brokerId: string; value: any; source: string; metadata?: Record<string, any> }): AppThunk =>
    (dispatch, getState) => {
        try {
            dispatch(brokerValuesSlice.actions.addNeededBroker({ appId, brokerId }));
            const state = getState();
            const brokerValue = selectBrokerValues(state)[brokerId];

            if (brokerValue) {
                dispatch(
                    brokerValuesSlice.actions.setBrokerValue({
                        ...brokerValue,
                        value,
                        metadata: {
                            ...brokerValue.metadata,
                            lastUpdatedBy: source,
                            ...metadata,
                        },
                    })
                );
            } else {
                dispatch(
                    brokerValuesSlice.actions.setBrokerValue({
                        id: brokerId,
                        value,
                        metadata: {
                            lastUpdatedBy: source,
                            ...metadata,
                        },
                    })
                );
            }

            return { success: true };
        } catch (error: any) {
            console.error("Error updating broker from external source:", error);
            return { success: false, error: error.message };
        }
    };