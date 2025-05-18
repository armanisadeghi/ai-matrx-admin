// import { AppThunk } from "@/lib/redux/store";
// import { FieldDefinition, FieldOption } from "@/types/customAppTypes";
// import { brokerActions } from "@/lib/redux/brokerSlice";

// export const setAppropriateValueForComponent =
//     ({ appId, brokerId, component, value, metadata = {} }: { appId: string; brokerId: string; component: FieldDefinition; value: any; metadata?: Record<string, any> }): AppThunk =>
//     (dispatch) => {
//         dispatch(brokerActions.addNeededBroker({ appId, brokerId }));

//         switch (component.component) {
//             case "input":
//             case "textarea":
//                 dispatch(
//                     brokerActions.setTextValue({
//                         id: brokerId,
//                         text: String(value),
//                         metadata: { sourceComponentId: component.id, ...metadata },
//                     })
//                 );
//                 break;

//             case "number":
//             case "numberPicker":
//                 dispatch(
//                     brokerActions.setNumberValue({
//                         id: brokerId,
//                         number: Number(value),
//                         metadata: { sourceComponentId: component.id, ...metadata },
//                     })
//                 );
//                 break;

//             case "select":
//                 if (typeof value === "object" && value !== null && value.id) {
//                     dispatch(
//                         brokerActions.setSelectValue({
//                             id: brokerId,
//                             value: value.id,
//                             selectedOption: value,
//                             metadata: { sourceComponentId: component.id, ...metadata },
//                         })
//                     );
//                 } else if (component.options) {
//                     const option = component.options.find((opt) => opt.id === value);
//                     if (option) {
//                         dispatch(
//                             brokerActions.setSelectValue({
//                                 id: brokerId,
//                                 value,
//                                 selectedOption: option,
//                                 metadata: { sourceComponentId: component.id, ...metadata },
//                             })
//                         );
//                     }
//                 }
//                 break;

//             case "multiselect":
//                 if (Array.isArray(value) && component.options) {
//                     const values = value
//                         .map((v) => (typeof v === "object" && v.id ? v.id : v))
//                         .filter((v) => component.options!.some((opt) => opt.id === v));
//                     const options = values
//                         .map((v) => component.options!.find((opt) => opt.id === v)!)
//                         .filter(Boolean);

//                     if (values.length > 0) {
//                         dispatch(
//                             brokerActions.setSelectValue({
//                                 id: brokerId,
//                                 value: values,
//                                 selectedOption: options,
//                                 metadata: { sourceComponentId: component.id, ...metadata },
//                             })
//                         );
//                     }
//                 }
//                 break;

//             case "checkbox":
//             case "switch":
//                 dispatch(
//                     brokerActions.setCheckboxValue({
//                         id: brokerId,
//                         checked: Boolean(value),
//                         metadata: { sourceComponentId: component.id, ...metadata },
//                     })
//                 );
//                 break;

//             case "radio":
//                 if (component.options) {
//                     const option = component.options.find((opt) => opt.id === value);
//                     if (option) {
//                         dispatch(
//                             brokerActions.setSelectValue({
//                                 id: brokerId,
//                                 value,
//                                 selectedOption: option,
//                                 metadata: { sourceComponentId: component.id, ...metadata },
//                             })
//                         );
//                     }
//                 }
//                 break;

//             case "date":
//                 dispatch(
//                     brokerActions.setDateValue({
//                         id: brokerId,
//                         date: String(value),
//                         metadata: { sourceComponentId: component.id, ...metadata },
//                     })
//                 );
//                 break;

//             case "slider":
//             case "rangeSlider":
//                 dispatch(
//                     brokerActions.setSliderValue({
//                         id: brokerId,
//                         value,
//                         metadata: { sourceComponentId: component.id, ...metadata },
//                     })
//                 );
//                 break;

//             case "jsonField":
//                 dispatch(
//                     brokerActions.setJsonValue({
//                         id: brokerId,
//                         value,
//                         metadata: { sourceComponentId: component.id, ...metadata },
//                     })
//                 );
//                 break;

//             default:
//                 dispatch(
//                     brokerActions.setBrokerValue({
//                         id: brokerId,
//                         value,
//                         sourceComponentId: component.id,
//                         metadata: { sourceComponentId: component.id, ...metadata },
//                     })
//                 );
//         }
//     };