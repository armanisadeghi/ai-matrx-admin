'use client';

import React from 'react';
import { FieldDefinition, FieldOption, ComponentType } from '../../builder.types';
import OptionsManager from './OptionsManager';

interface FieldBuilderProps {
  field: FieldDefinition;
  onChange: (field: FieldDefinition) => void;
  onAddOption?: () => void;
}

export const FieldBuilder: React.FC<FieldBuilderProps> = ({ field, onChange, onAddOption }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    onChange({
      ...field,
      [name]: newValue
    });
  };
  
  const handleComponentPropsChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    onChange({
      ...field,
      componentProps: {
        ...field.componentProps,
        [name]: newValue
      }
    });
  };

  const handleOptionChange = (index: number, key: keyof FieldOption, value: string) => {
    if (!field.options) return;
    
    const updatedOptions = [...field.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [key]: value
    };
    
    onChange({
      ...field,
      options: updatedOptions
    });
  };

  const removeOption = (index: number) => {
    if (!field.options) return;
    
    const updatedOptions = [...field.options];
    updatedOptions.splice(index, 1);
    
    onChange({
      ...field,
      options: updatedOptions
    });
  };

  // Check if the component type uses options
  const hasOptions = ['select', 'multiselect', 'radio', 'checkbox'].includes(field.component);
  
  // Check if the component type can have "other" option
  const canHaveOther = ['select', 'multiselect', 'radio', 'checkbox'].includes(field.component);

  return (
    <div className="h-full space-y-4 p-4 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 overflow-y-auto">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Field Definition Builder</h2>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Component Type</label>
        <select 
          name="component" 
          value={field.component} 
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <option value="input">Input</option>
          <option value="textarea">Textarea</option>
          <option value="select">Select</option>
          <option value="multiselect">Multiselect</option>
          <option value="radio">Radio</option>
          <option value="checkbox">Checkbox</option>
          <option value="slider">Slider</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="switch">Switch</option>
          <option value="jsonField">JSON Field</option>
          <option value="button">Button</option>
          <option value="numberPicker">Number Picker</option>
          <option value="fileUpload">File Upload</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Label</label>
        <input 
          type="text" 
          name="label" 
          value={field.label} 
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Description</label>
        <textarea 
          name="description" 
          value={field.description} 
          onChange={handleChange}
          rows={3}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Help Text</label>
        <textarea 
          name="helpText" 
          value={field.helpText} 
          onChange={handleChange}
          rows={2}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Placeholder</label>
        <input 
          type="text" 
          name="placeholder" 
          value={field.placeholder} 
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        />
      </div>
      
      <div className="flex items-center">
        <input 
          type="checkbox" 
          id="required" 
          name="required" 
          checked={field.required} 
          onChange={handleChange}
          className="mr-2 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-700"
        />
        <label htmlFor="required" className="text-sm text-gray-800 dark:text-gray-200">Required</label>
      </div>
      
      <div className="flex items-center">
        <input 
          type="checkbox" 
          id="disabled" 
          name="disabled" 
          checked={field.disabled} 
          onChange={handleChange}
          className="mr-2 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-700"
        />
        <label htmlFor="disabled" className="text-sm text-gray-800 dark:text-gray-200">Disabled</label>
      </div>
      
      {/* Include "Other" option checkbox for applicable component types */}
      {canHaveOther && (
        <div className="space-y-2 p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="includeOther" 
              name="includeOther" 
              checked={field.includeOther} 
              onChange={handleChange}
              className="mr-2 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-700"
            />
            <label htmlFor="includeOther" className="text-sm text-gray-800 dark:text-gray-200">Include "Other" option</label>
          </div>
        </div>
      )}
      
      {/* Options management for select, multiselect, radio, checkbox */}
      {hasOptions && (
        <OptionsManager 
          options={field.options || []}
          onOptionChange={handleOptionChange}
          onRemoveOption={removeOption}
          onAddOption={onAddOption || (() => {})}
        />
      )}
      
      {/* Switch component specific properties */}
      {field.component === 'switch' && (
        <div className="space-y-2 p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Switch Properties</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">ON Label</label>
              <input 
                type="text" 
                name="onLabel" 
                value={field.componentProps.onLabel || 'Yes'} 
                onChange={handleComponentPropsChange}
                className="w-full p-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Yes"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">OFF Label</label>
              <input 
                type="text" 
                name="offLabel" 
                value={field.componentProps.offLabel || 'No'} 
                onChange={handleComponentPropsChange}
                className="w-full p-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="No"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Component-specific properties based on the type */}
      {(field.component === 'slider' || field.component === 'number') && (
        <div className="space-y-2 p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Range Properties</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Min</label>
              <input 
                type="number" 
                name="min" 
                value={field.componentProps.min} 
                onChange={handleComponentPropsChange}
                className="w-full p-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Max</label>
              <input 
                type="number" 
                name="max" 
                value={field.componentProps.max} 
                onChange={handleComponentPropsChange}
                className="w-full p-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Step</label>
              <input 
                type="number" 
                name="step" 
                value={field.componentProps.step} 
                onChange={handleComponentPropsChange}
                className="w-full p-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      )}
      
      {field.component === 'textarea' && (
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Rows</label>
          <input 
            type="number" 
            name="rows" 
            value={field.componentProps.rows} 
            onChange={handleComponentPropsChange}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}
      
      {field.component === 'date' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Min Date</label>
            <input 
              type="date" 
              name="minDate" 
              value={field.componentProps.minDate} 
              onChange={handleComponentPropsChange}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Max Date</label>
            <input 
              type="date" 
              name="maxDate" 
              value={field.componentProps.maxDate} 
              onChange={handleComponentPropsChange}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldBuilder; 