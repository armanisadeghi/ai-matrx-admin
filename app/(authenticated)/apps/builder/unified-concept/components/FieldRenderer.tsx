'use client';

import React, { useState } from 'react';
import { FieldDefinition } from '../types';


interface FieldRendererProps {
  field: FieldDefinition;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({ field }) => {
  const [value, setValue] = useState(field.defaultValue);
  
  const handleChange = (e) => {
    const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValue(newValue);
  };
  
  const renderComponent = () => {
    switch (field.component) {
      case 'input':
        return (
          <input
            id={field.id}
            type="text"
            value={value || ""}
            onChange={handleChange}
            placeholder={field.placeholder}
            disabled={field.disabled}
            required={field.required}
            maxLength={field.componentProps.maxLength}
            minLength={field.componentProps.minLength}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        );
      
      case 'textarea':
        return (
          <textarea
            id={field.id}
            value={value || ""}
            onChange={handleChange}
            placeholder={field.placeholder}
            disabled={field.disabled}
            required={field.required}
            rows={field.componentProps.rows}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        );
      
      case 'select':
        return (
          <select
            id={field.id}
            value={value || ""}
            onChange={handleChange}
            disabled={field.disabled}
            required={field.required}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">{field.placeholder}</option>
            {field.options?.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <select
            id={field.id}
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              setValue(selected);
            }}
            disabled={field.disabled}
            required={field.required}
            multiple
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded h-32 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {field.options?.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option.id} className="flex items-center">
                <input
                  type="radio"
                  id={`${field.id}-${option.id}`}
                  name={field.id}
                  value={option.id}
                  checked={value === option.id}
                  onChange={handleChange}
                  disabled={field.disabled}
                  required={field.required}
                  className="mr-2 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-700"
                />
                <label htmlFor={`${field.id}-${option.id}`} className="text-sm text-gray-800 dark:text-gray-200">{option.label}</label>
              </div>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${field.id}-${option.id}`}
                  name={field.id}
                  value={option.id}
                  checked={Array.isArray(value) && value.includes(option.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue([...(Array.isArray(value) ? value : []), option.id]);
                    } else {
                      setValue(Array.isArray(value) ? value.filter(v => v !== option.id) : []);
                    }
                  }}
                  disabled={field.disabled}
                  className="mr-2 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-700"
                />
                <label htmlFor={`${field.id}-${option.id}`} className="text-sm text-gray-800 dark:text-gray-200">{option.label}</label>
              </div>
            ))}
          </div>
        );
      
      case 'slider':
        return (
          <div>
            <input
              type="range"
              id={field.id}
              min={field.componentProps.min}
              max={field.componentProps.max}
              step={field.componentProps.step}
              value={value || field.componentProps.min}
              onChange={handleChange}
              disabled={field.disabled}
              className="w-full accent-blue-600 dark:accent-blue-400"
            />
            <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
              <span>{field.componentProps.min}</span>
              <span>{value || field.componentProps.min}</span>
              <span>{field.componentProps.max}</span>
            </div>
          </div>
        );
      
      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            min={field.componentProps.min}
            max={field.componentProps.max}
            step={field.componentProps.step}
            value={value || ""}
            onChange={handleChange}
            placeholder={field.placeholder}
            disabled={field.disabled}
            required={field.required}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            min={field.componentProps.minDate}
            max={field.componentProps.maxDate}
            value={value || ""}
            onChange={handleChange}
            disabled={field.disabled}
            required={field.required}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        );
      
      default:
        return (
          <input
            type="text"
            id={field.id}
            value={value || ""}
            onChange={handleChange}
            placeholder={field.placeholder}
            disabled={field.disabled}
            required={field.required}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        );
    }
  };
  
  return (
    <div className="mb-4">
      {field.label && (
        <label htmlFor={field.id} className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
          {field.label}
          {field.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </label>
      )}
      
      {field.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{field.description}</p>
      )}
      
      {renderComponent()}
      
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
      )}
    </div>
  );
};

export default FieldRenderer; 