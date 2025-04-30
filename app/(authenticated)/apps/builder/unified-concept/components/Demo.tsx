'use client';

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import FieldBuilder from './FieldBuilder';
import FieldRenderer from './FieldRenderer';
import { FieldDefinition, ComponentType } from '../types';

// Initial field definition with all basic properties
const initialFieldDefinition: FieldDefinition = {
  // Core field properties
  id: uuidv4(),
  label: "What is your field of work?",
  description: "This helps us cater your resume for the industry for which it will be used.",
  helpText: "It's best to use the most specific industry, but if you're unsure, this can be changed later.",
  group: "personal-info",
  iconName: "briefcase",

  // Basic component properties
  component: "select" as ComponentType, 
  required: true,
  disabled: false,
  placeholder: "Select your industry",
  defaultValue: "",
  
  // Options (same structure as core field)
  options: [
    { id: uuidv4(), label: "Technology", description: "Software, IT, Hardware", helpText: "Includes all tech-related fields", iconName: "computer" },
    { id: uuidv4(), label: "Healthcare", description: "Medical, Pharmacy, Nursing", helpText: "For medical and health professionals", iconName: "heart" },
    { id: uuidv4(), label: "Finance", description: "Banking, Insurance, Investment", helpText: "Financial services and institutions", iconName: "dollar" },
    { id: uuidv4(), label: "Education", description: "Teaching, Administration, Research", helpText: "Both academic and educational roles", iconName: "book" }
  ],
  
  // Component-specific properties (simplified)
  componentProps: {
    // For text inputs
    maxLength: 100,
    minLength: 2,
    
    // For number inputs and sliders
    min: 0,
    max: 100,
    step: 1,
    
    // For textarea
    rows: 4,
    
    // For date
    minDate: "2020-01-01",
    maxDate: "2025-12-31",
  }
};

const Demo = () => {
  const [fieldDefinition, setFieldDefinition] = useState<FieldDefinition>(initialFieldDefinition);
  const [selectedComponentType, setSelectedComponentType] = useState<ComponentType | null>(null);
  
  // All available component types for the multi-component view
  const componentTypes: ComponentType[] = [
    'input', 
    'textarea', 
    'select', 
    'multiselect', 
    'radio', 
    'checkbox', 
    'slider', 
    'number', 
    'date'
  ];
  
  // Helper function to add a new option with UUID
  const addNewOption = () => {
    const newOption = {
      id: uuidv4(),
      label: "New Option",
      description: "",
      helpText: ""
    };
    
    setFieldDefinition({
      ...fieldDefinition,
      options: [...(fieldDefinition.options || []), newOption]
    });
  };
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="w-full p-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100 px-4">Interactive Field Definition Demo</h1>
        
        {/* Main split view */}
        <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)]">
          {/* Left side: Field Builder */}
          <div className="w-full md:w-1/2 md:max-w-lg p-4">
            <FieldBuilder 
              field={fieldDefinition} 
              onChange={setFieldDefinition} 
              onAddOption={addNewOption}
            />
          </div>
          
          {/* Right side: Preview area */}
          <div className="w-full md:w-1/2 p-4">
            {/* Current component preview */}
            <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm mb-6">
              <h2 className="text-lg font-semibold mb-3 capitalize text-gray-900 dark:text-gray-100">
                {fieldDefinition.component} Component (Current Selection)
              </h2>
              <FieldRenderer field={fieldDefinition} />
            </div>
            
            {/* Component type selector */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">View As Different Component</h3>
              <div className="flex flex-wrap gap-2">
                {componentTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedComponentType(type)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedComponentType === type
                        ? 'bg-blue-600 dark:bg-blue-700 text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
                {selectedComponentType && (
                  <button
                    onClick={() => setSelectedComponentType(null)}
                    className="px-3 py-1 text-sm rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            {/* Additional component view when a type is selected */}
            {selectedComponentType && (
              <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm">
                <h3 className="text-md font-semibold mb-2 capitalize text-gray-900 dark:text-gray-100">
                  Rendered as {selectedComponentType}
                </h3>
                <FieldRenderer 
                  field={{
                    ...fieldDefinition,
                    component: selectedComponentType
                  }} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo; 