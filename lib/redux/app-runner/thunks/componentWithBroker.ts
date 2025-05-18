// import { AppThunk } from "@/lib/redux/store";
// import { componentDefinitionsSlice } from "../slices/componentDefinitionsSlice";
// import { brokerValuesSlice } from "../slices/brokerValuesSlice";
// import { FieldDefinition } from "@/types/customAppTypes";
// import { setAppropriateValueForComponent } from "./componentValues";
// import { selectComponentInstance } from "../selectors/appletRuntimeSelectors";

// export const createComponentWithBroker =
//     ({
//         appId,
//         definitionId,
//         instanceId,
//         brokerId,
//         initialValue,
//         componentOverrides,
//     }: {
//         appId: string;
//         definitionId: string;
//         instanceId: string;
//         brokerId: string;
//         initialValue?: any;
//         componentOverrides?: Partial<FieldDefinition>;
//     }): AppThunk =>
//     async (dispatch, getState) => {
//         try {
//             // 1. Create the component instance
//             dispatch(
//                 componentDefinitionsSlice.actions.createComponentInstance({
//                     appId,
//                     definitionId,
//                     instanceId,
//                     overrides: componentOverrides,
//                 })
//             );

//             // 2. Map the component to a broker
//             dispatch(
//                 componentDefinitionsSlice.actions.mapComponentToBroker({
//                     appId,
//                     mapping: {
//                         componentId: definitionId,
//                         instanceId,
//                         brokerId,
//                     },
//                 })
//             );

//             // 3. Add broker to neededBrokers
//             dispatch(brokerValuesSlice.actions.addNeededBroker({ appId, brokerId }));

//             // 4. Set initial value if provided
//             if (initialValue !== undefined) {
//                 const componentDef = selectComponentInstance(getState(), appId, instanceId);
//                 if (componentDef) {
//                     dispatch(setAppropriateValueForComponent({ appId, brokerId, component: componentDef as FieldDefinition, value: initialValue }));
//                 } else {
//                     console.warn(`Component instance ${instanceId} not found after creation`);
//                 }
//             }

//             return { success: true, instanceId, brokerId };
//         } catch (error: any) {
//             console.error("Error creating component with broker:", error);
//             dispatch(componentDefinitionsSlice.actions.setError(error.message));
//             dispatch(brokerValuesSlice.actions.setError(error.message));
//             return { success: false, error: error.message };
//         }
//     };