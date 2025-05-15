// components/BrokerField.tsx
import React, { ComponentType } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { brokerConceptActions, brokerConceptSelectors, BrokerIdentifier } from '@/lib/redux/brokerSlice';

// Define the props that any broker-connected component must accept
export interface BrokerFieldProps<T = any> {
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  // Any other common props
}

// Define the configuration for the broker field
export interface BrokerFieldConfig<T = any> {
  broker: BrokerIdentifier;
  type?: 'text' | 'number' | 'boolean' | 'options' | 'table' | 'dynamic';
  defaultValue?: T;
  disabled?: boolean;
  transformer?: {
    // Transform value from broker to component
    fromBroker?: (brokerValue: any) => T;
    // Transform value from component to broker
    toBroker?: (componentValue: T) => any;
  };
}

// Main BrokerField component
export function BrokerField<T = any>({
  broker,
  type = 'dynamic',
  defaultValue,
  disabled = false,
  transformer,
  children,
}: BrokerFieldConfig<T> & { children: React.ReactElement<BrokerFieldProps<T>> }) {
  const dispatch = useAppDispatch();
  
  // Get the value from the broker based on type
  const brokerValue = useAppSelector(state => {
    switch (type) {
      case 'text':
        return brokerConceptSelectors.selectText(state, broker);
      case 'number':
        return brokerConceptSelectors.selectNumber(state, broker);
      case 'boolean':
        return brokerConceptSelectors.selectBoolean(state, broker);
      case 'options':
        return brokerConceptSelectors.selectBrokerOptions(state, broker);
      case 'table':
        return brokerConceptSelectors.selectTable(state, broker);
      default:
        return brokerConceptSelectors.selectValue(state, broker);
    }
  });

  // Transform the value if needed
  const value = transformer?.fromBroker 
    ? transformer.fromBroker(brokerValue)
    : (brokerValue ?? defaultValue);

  // Handle value changes
  const handleChange = (newValue: T) => {
    const valueToStore = transformer?.toBroker 
      ? transformer.toBroker(newValue)
      : newValue;

    // Dispatch the appropriate action based on type
    switch (type) {
      case 'text':
        dispatch(brokerConceptActions.setText({
          idArgs: broker,
          text: valueToStore as string
        }));
        break;
      case 'number':
        dispatch(brokerConceptActions.setNumber({
          idArgs: broker,
          value: valueToStore as number
        }));
        break;
      case 'boolean':
        dispatch(brokerConceptActions.setBoolean({
          idArgs: broker,
          value: valueToStore as boolean
        }));
        break;
      case 'options':
        dispatch(brokerConceptActions.setOptions({
          idArgs: broker,
          options: valueToStore as any
        }));
        break;
      case 'table':
        dispatch(brokerConceptActions.setTable({
          idArgs: broker,
          table: valueToStore as any
        }));
        break;
      default:
        dispatch(brokerConceptActions.setValue({
          idArgs: broker,
          value: valueToStore
        }));
    }
  };

  // Clone the child element and inject the broker props
  return React.cloneElement(children, {
    value,
    onChange: handleChange,
    disabled: disabled || children.props.disabled,
    ...children.props, // Preserve any additional props
  });
}