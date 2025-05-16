// app/demo/broker-field/page.tsx
'use client';

import React, { ComponentType, ReactElement } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { useTempBrokers, brokerConceptActions, brokerConceptSelectors, BrokerIdentifier } from '@/lib/redux/brokerSlice';
import {
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Slider,
  Switch,
  DatePicker,
  Checkbox,
  Label
} from '@/components/ui';

// ============================================
// Core BrokerField Types and Interfaces
// ============================================

export interface BrokerFieldProps<T = any> {
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export interface BrokerFieldConfig<T = any> {
  brokerMappedItem: BrokerIdentifier;
  type?: 'text' | 'number' | 'boolean' | 'options' | 'table' | 'dynamic';
  defaultValue?: T;
  disabled?: boolean;
  transformer?: {
    fromBroker?: (brokerValue: any) => T;
    toBroker?: (componentValue: T) => any;
  };
}

// ============================================
// Main BrokerField Component
// ============================================

type BrokerFieldRenderProps<T> = {
  children: (props: BrokerFieldProps<T>) => ReactElement;
} & BrokerFieldConfig<T>;

function BrokerField<T = any>({
  brokerMappedItem,
  type = 'dynamic',
  defaultValue,
  disabled = false,
  transformer,
  children,
}: BrokerFieldRenderProps<T>) {
  const dispatch = useAppDispatch();
  
  const brokerValue = useAppSelector(state => {
    switch (type) {
      case 'text':
        return brokerConceptSelectors.selectText(state, brokerMappedItem);
      case 'number':
        return brokerConceptSelectors.selectNumber(state, brokerMappedItem);
      case 'boolean':
        return brokerConceptSelectors.selectBoolean(state, brokerMappedItem);
      case 'options':
        return brokerConceptSelectors.selectBrokerOptions(state, brokerMappedItem);
      case 'table':
        return brokerConceptSelectors.selectTable(state, brokerMappedItem);
      default:
        return brokerConceptSelectors.selectValueWithoutBrokerId(state, brokerMappedItem);
    }
  });

  const value = transformer?.fromBroker 
    ? transformer.fromBroker(brokerValue)
    : (brokerValue ?? defaultValue);

  const handleChange = (newValue: T) => {
    const valueToStore = transformer?.toBroker 
      ? transformer.toBroker(newValue)
      : newValue;

    switch (type) {
      case 'text':
        dispatch(brokerConceptActions.setText({
          idArgs: brokerMappedItem,
          text: valueToStore as string
        }));
        break;
      case 'number':
        dispatch(brokerConceptActions.setNumber({
          idArgs: brokerMappedItem,
          value: valueToStore as number
        }));
        break;
      case 'boolean':
        dispatch(brokerConceptActions.setBoolean({
          idArgs: brokerMappedItem,
          value: valueToStore as boolean
        }));
        break;
      case 'options':
        dispatch(brokerConceptActions.setOptions({
          idArgs: brokerMappedItem,
          options: valueToStore as any
        }));
        break;
      case 'table':
        dispatch(brokerConceptActions.setTable({
          idArgs: brokerMappedItem,
          table: valueToStore as any
        }));
        break;
      default:
        dispatch(brokerConceptActions.setValueWithoutBrokerId({
          idArgs: brokerMappedItem,
          value: valueToStore
        }));
    }
  };

  return children({
    value,
    onChange: handleChange,
    disabled
  });
}

// Higher-order component for easier use with component instances
interface WithBrokerProps<T = any> extends BrokerFieldConfig<T> {
  children: ReactElement;
}

function WithBroker<T = any>({
  children,
  brokerMappedItem,
  type,
  defaultValue,
  disabled,
  transformer,
}: WithBrokerProps<T>) {
  return (
    <BrokerField<T> 
      brokerMappedItem={brokerMappedItem}
      type={type}
      defaultValue={defaultValue}
      disabled={disabled}
      transformer={transformer}
    >
      {(brokerProps) => {
        // Cast children.props to a Record to make TypeScript happy
        const childProps = children.props as Record<string, any>;
        
        // Merge props while preserving type safety
        const mergedProps = {
          ...childProps,
          value: brokerProps.value,
          onChange: brokerProps.onChange,
          disabled: brokerProps.disabled || childProps.disabled
        };
        
        return React.cloneElement(children, mergedProps);
      }}
    </BrokerField>
  );
}

// ============================================
// Wired UI Components with Broker Integration
// ============================================

// Text Input Component
interface WiredInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function WiredTextInput({ value = '', onChange = () => {}, disabled, placeholder, className }: WiredInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  );
}

// Number Input Component
interface WiredNumberInputProps {
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

function WiredNumberInput({ value = 0, onChange = () => {}, disabled, min, max, step, placeholder }: WiredNumberInputProps) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className="w-32"
    />
  );
}

// Toggle Component
interface WiredToggleProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}

function WiredToggle({ value = false, onChange = () => {}, disabled, label }: WiredToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
        id={`toggle-${label?.replace(/\s+/g, '-').toLowerCase() || 'switch'}`}
      />
      {label && (
        <Label 
          htmlFor={`toggle-${label.replace(/\s+/g, '-').toLowerCase() || 'switch'}`}
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          {label}
        </Label>
      )}
    </div>
  );
}

// Select Component
interface WiredSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  options: { id: string; label: string; }[];
  placeholder?: string;
}

function WiredSelect({ value = '', onChange = () => {}, disabled, options, placeholder }: WiredSelectProps) {
  return (
    <Select 
      value={value} 
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder || 'Select an option'} />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Textarea Component
interface WiredTextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}

function WiredTextarea({ value = '', onChange = () => {}, disabled, placeholder, rows = 4 }: WiredTextareaProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full resize-none"
      rows={rows}
    />
  );
}

// Slider Component
interface WiredSliderProps {
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

function WiredSlider({ value = 0, onChange = () => {}, disabled, min = 0, max = 100, step = 1 }: WiredSliderProps) {
  return (
    <div className="flex items-center space-x-4">
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className="w-48"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
        {value}
      </span>
    </div>
  );
}

// Date Picker Component
interface WiredDatePickerProps {
  value?: Date | null;
  onChange?: (value: Date | null) => void;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

function WiredDatePicker({ value = null, onChange = () => {}, disabled, minDate, maxDate }: WiredDatePickerProps) {
  return (
    <DatePicker
      value={value as Date}
      onChange={onChange}
      placeholder="Select a date"
      buttonVariant="outline"
      calendarProps={{
        disabled,
        fromMonth: minDate,
        toMonth: maxDate,
        disableNavigation: disabled
      }}
    />
  );
}


// ============================================
// Helper Components
// ============================================

function BrokerValueDisplay({ brokers }: { brokers: Record<string, BrokerIdentifier> }) {
  const values = useAppSelector(state => {
    const result: Record<string, any> = {};
    Object.entries(brokers).forEach(([key, broker]) => {
      result[key] = brokerConceptSelectors.selectValueWithoutBrokerId(state, broker);
    });
    return result;
  });

  return (
    <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-auto">
      <code className="text-sm text-gray-800 dark:text-gray-300">
        {JSON.stringify(values, null, 2)}
      </code>
    </pre>
  );
}


export { 
  BrokerField, 
  WithBroker, 
  WiredTextInput, 
  WiredNumberInput, 
  WiredToggle, 
  WiredSelect, 
  WiredTextarea, 
  WiredSlider, 
  WiredDatePicker, 
  BrokerValueDisplay 
};