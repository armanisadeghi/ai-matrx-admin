// import { brokerConceptActions, brokerConceptSelectors } from "@/lib/redux/brokerSlice";
// import { useAppDispatch, useAppSelector } from "@/lib/redux";
// import { BrokerFieldConfig, BrokerFieldProps } from "./BrokerField";
// import React from "react";

// // ExtendedBrokerField.tsx
// export interface ExtendedBrokerFieldProps<T = any> extends BrokerFieldProps<T> {
//     brokerExists?: boolean;
//     clearValue?: () => void;
//     incrementValue?: (amount?: number) => void;
//     appendText?: (text: string) => void;
//   }
  
//   export function ExtendedBrokerField<T = any>({
//     broker,
//     type = 'dynamic',
//     children,
//     ...config
//   }: BrokerFieldConfig<T> & { 
//     children: React.ReactElement<ExtendedBrokerFieldProps<T>> 
//   }) {
//     const dispatch = useAppDispatch();
    
//     const brokerExists = useAppSelector(state => 
//       brokerConceptSelectors.selectHasValue(state, broker)
//     );
    
//     // ... same value and onChange logic as before ...
    
//     // Extended functions
//     const clearValue = () => {
//       switch (type) {
//         case 'text':
//           dispatch(brokerConceptActions.clearText({ idArgs: broker }));
//           break;
//         case 'number':
//           dispatch(brokerConceptActions.clearNumber({ idArgs: broker }));
//           break;
//         // ... other types
//         default:
//           dispatch(brokerConceptActions.removeValue({ idArgs: broker }));
//       }
//     };
    
//     const incrementValue = (amount?: number) => {
//       if (type === 'number') {
//         dispatch(brokerConceptActions.incrementNumber({ idArgs: broker, amount }));
//       }
//     };
    
//     const appendText = (text: string) => {
//       if (type === 'text') {
//         dispatch(brokerConceptActions.appendText({ idArgs: broker, text }));
//       }
//     };
    
//     return React.cloneElement(children, {
//       value,
//       onChange: handleChange,
//       disabled: config.disabled,
//       brokerExists,
//       clearValue,
//       incrementValue,
//       appendText,
//       ...children.props,
//     });
//   }