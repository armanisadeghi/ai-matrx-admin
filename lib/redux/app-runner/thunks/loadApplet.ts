import { nanoid } from "nanoid";
import { AppThunk } from "@/lib/redux/store";
import { componentDefinitionsSlice } from "../slices/componentDefinitionsSlice";
import { brokerValuesSlice } from "../slices/brokerValuesSlice";
import { CustomAppletConfig } from "@/types/customAppTypes";
import { setAppropriateValueForComponent } from "./componentValues";

export const loadApplet =
    ({
        appId,
        applet,
        initialBrokerValues,
    }: {
        appId: string;
        applet: CustomAppletConfig;
        initialBrokerValues?: Record<string, any>;
    }): AppThunk<Promise<any>> =>
    async (dispatch) => {
        try {
            dispatch(componentDefinitionsSlice.actions.setLoading(true));
            dispatch(brokerValuesSlice.actions.setLoading(true));

            // 1. Add the applet to state
            const appletId = applet.id || nanoid();
            dispatch(componentDefinitionsSlice.actions.addApplet({ appId, applet: { ...applet, id: appletId } }));

            // 2. Add all containers
            const containers = applet.containers || [];
            containers.forEach((container) => {
                dispatch(componentDefinitionsSlice.actions.addContainer({ appId, container }));
            });

            // 3. For each field, create a component instance and map to a broker
            const componentInstances: { instanceId: string; brokerId: string }[] = [];
            const neededBrokers: string[] = [];

            for (const container of containers) {
                for (const field of container.fields) {
                    const instanceId = `${appId}_${field.id}_${nanoid()}`;
                    const brokerId = `broker_${appId}_${field.id}_${nanoid()}`;

                    // Create component instance
                    dispatch(
                        componentDefinitionsSlice.actions.createComponentInstance({
                            appId,
                            definitionId: field.id,
                            instanceId,
                            overrides: field,
                        })
                    );

                    // Map to broker
                    dispatch(
                        componentDefinitionsSlice.actions.mapComponentToBroker({
                            appId,
                            mapping: {
                                componentId: field.id,
                                instanceId,
                                brokerId,
                            },
                        })
                    );

                    componentInstances.push({ instanceId, brokerId });
                    neededBrokers.push(brokerId);

                    // Set initial value if provided (ignore defaultValue)
                    if (initialBrokerValues && initialBrokerValues[field.id] !== undefined) {
                        dispatch(
                            setAppropriateValueForComponent({ appId, brokerId, component: field, value: initialBrokerValues[field.id] })
                        );
                    }
                }
            }

            // Add all brokers to neededBrokers
            dispatch(brokerValuesSlice.actions.addNeededBrokers({ appId, brokerIds: neededBrokers }));

            dispatch(componentDefinitionsSlice.actions.setLoading(false));
            dispatch(brokerValuesSlice.actions.setLoading(false));

            return { success: true, componentInstances };
        } catch (error: any) {
            console.error("Error loading applet:", error);
            dispatch(componentDefinitionsSlice.actions.setError(error.message));
            dispatch(brokerValuesSlice.actions.setError(error.message));
            dispatch(componentDefinitionsSlice.actions.setLoading(false));
            dispatch(brokerValuesSlice.actions.setLoading(false));
            return { success: false, error: error.message };
        }
    };
