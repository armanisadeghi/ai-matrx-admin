import React, { forwardRef } from 'react';
import SchemaBasedJsonEditor from './SchemaBasedJsonEditor';
import JsonEditor from '../add-ons/JsonEditor';
import EntityTagsManager from './EntityTagsManager';
import EntityOptionsManager from './EntityOptionsManager';

interface JsonEditorWrapperProps {
  subComponent?: string;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  id?: string;
  required?: boolean;
  rows?: number;
  componentProps?: Record<string, any>;
}

const JsonEditorWrapper = forwardRef<HTMLTextAreaElement | HTMLInputElement, JsonEditorWrapperProps>(({
  subComponent = 'default',
  value,
  onChange,
  disabled = false,
  onFocus,
  onBlur,
  className,
  id,
  required,
  rows,
  componentProps
}, ref) => {
  const renderSubComponent = () => {
    switch (subComponent) {
      case 'optionsManager':
        return (
          <EntityOptionsManager
            ref={ref as React.Ref<HTMLInputElement>}
            value={value}
            onChange={onChange}
            disabled={disabled}
            onFocus={onFocus}
            onBlur={onBlur}
            className={className}
          />
        );
      case 'tagsManager':
        return (
          <EntityTagsManager
            ref={ref as React.Ref<HTMLInputElement>}
            value={value}
            onChange={onChange}
            disabled={disabled}
            onFocus={onFocus}
            onBlur={onBlur}
            className={className}
          />
        );
      case 'schemaBasedJson':
        if (componentProps?.schema) {
          return (
            <SchemaBasedJsonEditor
              ref={ref as React.Ref<HTMLInputElement>}
              schema={componentProps.schema}
              value={value}
              onChange={onChange}
              disabled={disabled}
              onFocus={onFocus}
              onBlur={onBlur}
              className={className}
            />
          );
        }
        return null;
      default:
        return (
          <JsonEditor
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={id}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            rows={rows}
            onFocus={onFocus}
            onBlur={onBlur}
            className={className}
          />
        );
    }
  };

  return renderSubComponent();
});

JsonEditorWrapper.displayName = "JsonEditorWrapper";

export default JsonEditorWrapper;