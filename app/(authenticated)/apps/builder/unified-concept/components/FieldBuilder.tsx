'use client';

import React from 'react';
import { FieldDefinition, FieldOption } from '../types';

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
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Field ID</label>
        <input 
          type="text" 
          name="id" 
          value={field.id} 
          onChange={handleChange}
          disabled
          readOnly
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">UUIDs are automatically generated and should not be modified</p>
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
      
      {/* Options management for select, multiselect, radio, checkbox */}
      {hasOptions && (
        <div className="space-y-3 p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Options</h3>
            <button
              type="button"
              onClick={onAddOption}
              className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded"
            >
              Add Option
            </button>
          </div>
          
          {field.options?.map((option, index) => (
            <div key={option.id} className="space-y-2 p-2 border border-gray-200 dark:border-gray-700 rounded">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Option ID: {option.id.substring(0, 8)}...</span>
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="p-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                  className="w-full p-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
                <input
                  type="text"
                  value={option.description || ''}
                  onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                  className="w-full p-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          ))}
          
          {(!field.options || field.options.length === 0) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No options defined. Add some options above.</p>
          )}
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
      
      {(field.component === 'input' || field.component === 'textarea') && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Min Length</label>
            <input 
              type="number" 
              name="minLength" 
              value={field.componentProps.minLength} 
              onChange={handleComponentPropsChange}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Max Length</label>
            <input 
              type="number" 
              name="maxLength" 
              value={field.componentProps.maxLength} 
              onChange={handleComponentPropsChange}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
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