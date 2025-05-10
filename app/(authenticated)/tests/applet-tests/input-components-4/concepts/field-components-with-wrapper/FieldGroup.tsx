import React, { useState, useEffect } from 'react';
import { ButtonField, SelectField, InputField, TextareaField } from './index';
import { GroupFieldConfig, FieldGroupProps } from './types';
import SearchField from '@/features/applet/a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/search-bar/field/SearchField';

const FieldGroup: React.FC<FieldGroupProps> = ({
  id,
  label,
  placeholder = "Select options",
  groups,
  activeTab: externalActiveTab,
  onTabChange,
  onSubmit,
  submitButtonText = "Submit",
  cancelButtonText = "Cancel",
  onCancel,
  isExpanded: externalIsExpanded,
  width = "w-full max-w-3xl",
  maxHeight = "max-h-[80vh]"
}) => {
  // UI state
  const [isActive, setIsActive] = useState<boolean>(externalIsExpanded ?? false);
  const [activeTab, setActiveTab] = useState<string>(externalActiveTab || (groups[0]?.tab.value ?? ''));
  
  // Update active tab if external control changes
  useEffect(() => {
    if (externalActiveTab !== undefined) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);
  
  // Update expanded state if external control changes
  useEffect(() => {
    if (externalIsExpanded !== undefined) {
      setIsActive(externalIsExpanded);
    }
  }, [externalIsExpanded]);

  // Get active group based on tab
  const activeGroup = groups.find(group => group.tab.value === activeTab);
  
  // Handle tab change
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    if (onTabChange) {
      onTabChange(tabValue);
    }
  };
  
  // Handle open/close
  const handleOpenChange = (open: boolean) => {
    setIsActive(open);
  };
  
  // Handle click
  const handleClick = () => {
    setIsActive(true);
  };
  
  // Handle submit
  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
    setIsActive(false);
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setIsActive(false);
  };
  
  // Render specific field type based on configuration
  const renderField = (fieldConfig: GroupFieldConfig, index: number, totalFields: number) => {
    const isLast = index === totalFields - 1;
    const commonProps = {
      id: fieldConfig.brokerId,
      label: fieldConfig.label,
      placeholder: fieldConfig.placeholder,
      isLast,
    };

    switch (fieldConfig.type) {
      case 'button':
        return (
          <ButtonField
            {...commonProps}
            customConfig={fieldConfig.customConfig as any}
          />
        );
      case 'select':
        return (
          <SelectField
            {...commonProps}
            customConfig={fieldConfig.customConfig as any}
          />
        );
      case 'number':
        return (
          <InputField
            {...commonProps}
            customConfig={{
              type: 'number',
              ...(fieldConfig.customConfig as any)
            }}
          />
        );
      case 'date':
        return (
          <InputField
            {...commonProps}
            customConfig={{
              type: 'date',
              ...(fieldConfig.customConfig as any)
            }}
          />
        );
      case 'textarea':
        return (
          <TextareaField
            {...commonProps}
            customConfig={fieldConfig.customConfig as any}
          />
        );
      case 'input':
      default:
        return (
          <InputField
            {...commonProps}
            customConfig={fieldConfig.customConfig as any}
          />
        );
    }
  };

  // Get active tab display value
  const activeTabLabel = groups.find(group => group.tab.value === activeTab)?.tab.label || placeholder;

  return (
    <SearchField
      id={id}
      label={label}
      placeholder={activeTabLabel}
      isActive={isActive}
      onClick={handleClick}
      onOpenChange={handleOpenChange}
      preventClose={true}
    >
      <div className={`${width} bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden`}>
        {/* Tabs header */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {groups.map((group) => (
            <button
              key={`tab-${group.tab.value}`}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === group.tab.value 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              onClick={() => handleTabChange(group.tab.value)}
            >
              <div className="flex items-center gap-2">
                {group.tab.icon && group.tab.icon}
                {group.tab.label}
              </div>
            </button>
          ))}
        </div>

        {/* Active group content */}
        <div className={`overflow-y-auto p-4 ${maxHeight}`}>
          {activeGroup && (
            <>
              {activeGroup.title && (
                <h3 className="text-lg font-semibold mb-2 dark:text-white">{activeGroup.title}</h3>
              )}
              {activeGroup.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{activeGroup.description}</p>
              )}

              <div className="space-y-4">
                {activeGroup.fields.map((field, index) => (
                  <div key={`field-${field.brokerId}`}>
                    {renderField(field, index, activeGroup.fields.length)}
                    {field.helpText && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions footer */}
        {(onSubmit || onCancel) && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            {onCancel && (
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={handleCancel}
              >
                {cancelButtonText}
              </button>
            )}
            {onSubmit && (
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={handleSubmit}
              >
                {submitButtonText}
              </button>
            )}
          </div>
        )}
      </div>
    </SearchField>
  );
};

export default FieldGroup;