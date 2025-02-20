import React, { useMemo } from 'react';
import { 
  ButtonField, SelectField, InputField, TextareaField,
  GroupFieldConfig, TabConfig, ButtonFieldConfig, SelectFieldConfig, 
  InputFieldConfig, TextareaFieldConfig
} from '../field-components';
import { FieldRow } from '../field-components';

interface FieldGroupAdapterProps {
  fields: GroupFieldConfig[];
  actionButton?: React.ReactNode;
  className?: string;
}

const FieldGroupAdapter: React.FC<FieldGroupAdapterProps> = ({
  fields,
  actionButton,
  className = '',
}) => {
  // Create field components based on configuration
  const fieldComponents = useMemo(() => {
    return fields.map((field) => {
      // Common props without customConfig (will be typed properly for each component)
      const commonProps = {
        id: field.brokerId,
        label: field.label,
        placeholder: field.placeholder,
      };

      switch (field.type) {
        case 'button':
          return (
            <ButtonField 
              key={field.brokerId} 
              {...commonProps}
              customConfig={field.customConfig as ButtonFieldConfig} 
            />
          );
        case 'select':
          return (
            <SelectField 
              key={field.brokerId} 
              {...commonProps}
              customConfig={field.customConfig as SelectFieldConfig}
            />
          );
        case 'number':
          return (
            <InputField 
              key={field.brokerId} 
              {...commonProps}
              customConfig={{
                type: 'number',
                ...(field.customConfig as InputFieldConfig || {})
              }}
            />
          );
        case 'date':
          return (
            <InputField 
              key={field.brokerId} 
              {...commonProps}
              customConfig={{
                type: 'date',
                ...(field.customConfig as InputFieldConfig || {})
              }}
            />
          );
        case 'textarea':
          return (
            <TextareaField 
              key={field.brokerId} 
              {...commonProps}
              customConfig={field.customConfig as TextareaFieldConfig}
            />
          );
        case 'input':
        default:
          return (
            <InputField 
              key={field.brokerId} 
              {...commonProps}
              customConfig={field.customConfig as InputFieldConfig}
            />
          );
      }
    });
  }, [fields]);

  return (
    <FieldRow 
      actionButton={actionButton}
      className={className}
    >
      {fieldComponents}
    </FieldRow>
  );
};

export default FieldGroupAdapter;