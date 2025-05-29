import React, { forwardRef } from 'react';
import SchemaBasedJsonEditor from './SchemaBasedJsonEditor';
import JsonEditor from '../add-ons/JsonEditor';
import EntityTagsManager from './EntityTagsManager';
import EntityOptionsManager from './EntityOptionsManager';

// Centralized JSON data utilities for all JSON components
const jsonDataUtils = {
  /**
   * Detects if a string is stringified JSON and unwraps it
   * Handles database entries like "{\"value\":\"dict_structured\"}"
   */
  unwrapStringifiedJson: (value: any): any => {
    if (typeof value !== "string") return value;
    
    try {
      // Check if it's a stringified JSON by trying to parse it
      const parsed = JSON.parse(value);
      
      // If parsed result is an object or array (not primitive), it was likely stringified JSON
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    } catch (err) {
      // If parsing fails, it's just a regular string
    }
    
    return value;
  },

  /**
   * Ensures consistent data output - sends objects when valid, strings when invalid
   * Prevents string-wrapping issues in the database
   */
  normalizeOutput: (value: any): any => {
    // If it's already an object/array, return as-is
    if (typeof value === "object" && value !== null) {
      return value;
    }
    
    // If it's a string, try to parse it
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        // Return parsed object if successful
        if (typeof parsed === "object" && parsed !== null) {
          return parsed;
        }
      } catch (err) {
        // If parsing fails, return original string (no errors)
      }
    }
    
    return value;
  }
};

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
  // Unwrap any stringified JSON from database before passing to sub-components
  const processedValue = jsonDataUtils.unwrapStringifiedJson(value);
  
  // Create wrapped onChange that normalizes output
  const handleChange = (newValue: any) => {
    const normalizedValue = jsonDataUtils.normalizeOutput(newValue);
    onChange(normalizedValue);
  };

  const renderSubComponent = () => {
    switch (subComponent) {
      case 'optionsManager':
        return (
          <EntityOptionsManager
            ref={ref as React.Ref<HTMLInputElement>}
            value={processedValue}
            onChange={handleChange}
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
            value={processedValue}
            onChange={handleChange}
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
              value={processedValue}
              onChange={handleChange}
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
            value={processedValue}
            onChange={handleChange}
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