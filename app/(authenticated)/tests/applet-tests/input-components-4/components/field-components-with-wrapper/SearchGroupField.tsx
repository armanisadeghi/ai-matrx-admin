// SearchGroupField.tsx
import React from 'react';
import SearchField from '../SearchField';
import { ButtonField, SelectField, InputField, TextareaField } from './index';
import { ButtonFieldConfig, GroupFieldConfig, SelectFieldConfig, TextareaFieldConfig } from './types';

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
  // Render appropriate field component without popover
  const renderFieldComponent = (field: GroupFieldConfig) => {
    const commonProps = {
      id: field.brokerId,
      label: field.label,
      placeholder: field.placeholder || '',
      customConfig: field.customConfig,
      // Prevent these components from rendering their own popovers
      preventPopover: true,
      // Ensure these components don't try to manage active state
      isActive: false,
      onClick: () => {},
      onOpenChange: () => {},
    };

    switch (field.type) {
      case 'select':
        return (
          <div className="mb-4">
            <SelectField {...commonProps} customConfig={field.customConfig as SelectFieldConfig} />
          </div>
        );
      case 'button':
        return (
          <div className="mb-4">
            <ButtonField {...commonProps} customConfig={field.customConfig as ButtonFieldConfig} />
          </div>
        );
      case 'textarea':
        return (
          <div className="mb-4">
            <TextareaField {...commonProps} customConfig={field.customConfig as TextareaFieldConfig} />
          </div>
        );
      case 'date':
        return (
          <div className="mb-4">
            <InputField {...commonProps} customConfig={{ type: 'date', ...field.customConfig }} />
          </div>
        );
      case 'number':
        return (
          <div className="mb-4">
            <InputField {...commonProps} customConfig={{ type: 'number', ...field.customConfig }} />
          </div>
        );
      default:
        return (
          <div className="mb-4">
            <InputField {...commonProps} customConfig={{ type: 'text', ...field.customConfig }} />
          </div>
        );
    }
  };

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
      <div className="p-6 w-80">
        <h3 className="text-lg font-medium mb-6">{label}</h3>
        <div>
          {fields.map(field => renderFieldComponent(field))}
        </div>
      </div>
    </SearchField>
  );
};

export default SearchGroupField;