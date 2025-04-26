import React, { useState } from 'react';
import SearchField from '@/features/applet/runner/components/search-bar/field/SearchField';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps, TextareaFieldConfig } from './types';

const TextareaField: React.FC<FieldProps<TextareaFieldConfig>> = ({
  id,
  label,
  placeholder = "Enter text",
  isLast = false,
  actionButton = null,
  defaultValue,
  onValueChange,
  customConfig = {},
  customContent = null
}) => {
  // Extract textarea config options with defaults
  const {
    rows = 4,
    maxLength,
    resize = "vertical",
    width = "w-full max-w-md",
    textareaClassName = "w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
  } = customConfig as TextareaFieldConfig;

  // Use value broker for managing the textarea value
  const { currentValue, setValue } = useValueBroker(id);
  
  // UI state
  const [isActive, setIsActive] = useState<boolean>(false);
  
  // Initialize with defaultValue if provided and no currentValue exists
  React.useEffect(() => {
    if (defaultValue !== undefined && currentValue === null) {
      setValue(defaultValue);
    }
  }, [defaultValue, currentValue, setValue]);
  
  // Handle change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (onValueChange) {
      onValueChange(newValue);
    }
  };
  
  // Handle field click/focus
  const handleFocus = () => {
    setIsActive(true);
  };
  
  // Handle field blur
  const handleBlur = () => {
    setIsActive(false);
  };

  // Generate resize style
  const resizeStyle = { resize } as React.CSSProperties;

  return (
    <SearchField
      id={id}
      label={label}
      placeholder={placeholder}
      isActive={isActive}
      onClick={() => setIsActive(true)}
      onOpenChange={(open) => setIsActive(open)}
      isLast={isLast}
      actionButton={actionButton}
      preventClose={true}
    >
      {customContent ? (
        customContent
      ) : (
        <div className={`${width}`}>
          <textarea
            id={`${id}-textarea`}
            className={textareaClassName}
            value={currentValue ?? ''}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            style={resizeStyle}
          />
        </div>
      )}
    </SearchField>
  );
};

export default TextareaField;