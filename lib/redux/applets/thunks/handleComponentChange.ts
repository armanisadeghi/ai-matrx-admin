import { AppThunk } from "@/lib/redux/store";
import { brokerValuesSlice } from "../slices/brokerValuesSlice";
import { selectComponentToBrokerMap, selectComponentInstance } from "../selectors/appletRuntimeSelectors";
import { setAppropriateValueForComponent } from "./componentValues";

export const handleComponentChange =
    ({
        appId,
        instanceId,
        value,
        additionalMetadata = {},
    }: {
        appId: string;
        instanceId: string;
        value: any;
        additionalMetadata?: Record<string, any>;
    }): AppThunk =>
    (dispatch, getState) => {
        try {
            const state = getState();
            const mapping = selectComponentToBrokerMap(state)[appId]?.find((map) => map.instanceId === instanceId);

            if (!mapping) {
                console.warn(`No broker mapping found for component instance ${instanceId}`);
                return { success: false };
            }

            const component = selectComponentInstance(state, appId, instanceId);
            if (!component) {
                console.warn(`Component instance ${instanceId} not found`);
                return { success: false };
            }

            dispatch(
                setAppropriateValueForComponent({ appId, brokerId: mapping.brokerId, component, value, metadata: additionalMetadata })
            );
            dispatch(brokerValuesSlice.actions.addNeededBroker({ appId, brokerId: mapping.brokerId }));

            return { success: true };
        } catch (error: any) {
            console.error("Error handling component change:", error);
            return { success: false, error: error.message };
        }
    };
