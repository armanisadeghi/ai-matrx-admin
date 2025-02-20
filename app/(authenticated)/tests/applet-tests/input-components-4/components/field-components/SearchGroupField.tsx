// SearchGroupField.tsx
import React, { useEffect, useRef } from 'react';
import SearchField from '../SearchField';
import { GroupFieldConfig, ButtonFieldConfig, SelectFieldConfig, TextareaFieldConfig, InputFieldConfig } from './types';
import ButtonField from './ButtonField';
import SelectField from './SelectField';
import InputField from './InputField';
import TextareaField from './TextareaField';

interface SearchGroupFieldProps {
  id: string;
  label: string;
  placeholder: string;
  fields: GroupFieldConfig[];
  isActive: boolean;
  onClick: (id: string) => void;
  onOpenChange: (open: boolean) => void;
  isLast?: boolean;
  actionButton?: React.ReactNode;
  className?: string;
}

const SearchGroupField: React.FC<SearchGroupFieldProps> = ({
  id,
  label,
  placeholder,
  fields,
  isActive,
  onClick,
  onOpenChange,
  isLast = false,
  actionButton,
  className = ''
}) => {
  // Refs to hold rendered field components and their containers
  const fieldRefs = useRef<Map<string, React.ReactNode>>(new Map());
  const mountPointsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  
  // Create the field components
  const renderField = (field: GroupFieldConfig) => {
    switch (field.type) {
      case 'select': {
        const { customConfig, ...commonProps } = field;
        return (
          <SelectField
            id={field.brokerId}
            label={field.label}
            placeholder={field.placeholder || ''}
            customConfig={customConfig as SelectFieldConfig}
          />
        );
      }
      case 'button': {
        const { customConfig, ...commonProps } = field;
        return (
          <ButtonField
            id={field.brokerId}
            label={field.label}
            placeholder={field.placeholder || ''}
            customConfig={customConfig as ButtonFieldConfig}
          />
        );
      }
      case 'textarea': {
        const { customConfig, ...commonProps } = field;
        return (
          <TextareaField
            id={field.brokerId}
            label={field.label}
            placeholder={field.placeholder || ''}
            customConfig={customConfig as TextareaFieldConfig}
          />
        );
      }
      case 'date': {
        const { customConfig, ...commonProps } = field;
        return (
          <InputField
            id={field.brokerId}
            label={field.label}
            placeholder={field.placeholder || ''}
            customConfig={{ type: 'date', ...customConfig }}
          />
        );
      }
      case 'number': {
        const { customConfig, ...commonProps } = field;
        return (
          <InputField
            id={field.brokerId}
            label={field.label}
            placeholder={field.placeholder || ''}
            customConfig={{ type: 'number', ...customConfig }}
          />
        );
      }
      default: {
        const { customConfig, ...commonProps } = field;
        return (
          <InputField
            id={field.brokerId}
            label={field.label}
            placeholder={field.placeholder || ''}
            customConfig={customConfig as InputFieldConfig}
          />
        );
      }
    }
  };

  // Store mount point references
  const setMountPoint = (id: string, element: HTMLDivElement | null) => {
    mountPointsRef.current.set(id, element);
  };

  // This effect renders field components only once and stores them
  useEffect(() => {
    fields.forEach(field => {
      if (!fieldRefs.current.has(field.brokerId)) {
        fieldRefs.current.set(field.brokerId, renderField(field));
      }
    });
  }, [fields]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SearchField
      id={id}
      label={label}
      placeholder={placeholder}
      isActive={isActive}
      onClick={onClick}
      onOpenChange={onOpenChange}
      isLast={isLast}
      actionButton={isLast ? actionButton : undefined}
      className={className}
    >
      <div className="w-full min-w-96 p-2 bg-white rounded-xl dark:bg-gray-800 border dark:border-gray-700">
        <h3 className="text-lg font-medium mb-6">{label}</h3>
        <div>
          {fields.map(field => (
            <div key={field.brokerId} className="mb-6 last:mb-0">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                {field.label}
              </label>
              {/* Directly render the saved component */}
              {fieldRefs.current.get(field.brokerId)}
              {field.helpText && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </SearchField>
  );
};

export default SearchGroupField;