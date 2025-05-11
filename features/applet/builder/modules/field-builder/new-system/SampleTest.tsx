'use client';

import React, { useEffect } from 'react';
import { useAppDispatch } from '@/lib/redux';
import { v4 as uuidv4 } from 'uuid';
import NewFieldRenderer from './NewFieldRenderer';
import { resetMapFull } from '@/lib/redux/app-runner/slices/brokerSlice';
import { ComponentType, FieldDefinition } from '@/types/customAppTypes';

// Sample textarea field
const createSampleTextareaField = (): FieldDefinition => ({
  id: uuidv4(),
  label: 'Sample Textarea',
  description: 'This is a description of the textarea field',
  helpText: 'This is help text for the textarea field',
  component: 'textarea',
  required: false,
  placeholder: 'Enter your text here...',
  componentProps: {
    rows: 4
  }
});

// Sample select field with options
const createSampleSelectField = (): FieldDefinition => ({
  id: uuidv4(),
  label: 'Sample Select',
  description: 'This is a description of the select field',
  helpText: 'This is help text for the select field',
  component: 'select',
  required: true,
  placeholder: 'Select an option',
  options: [
    { id: 'option1', label: 'Option 1' },
    { id: 'option2', label: 'Option 2' },
    { id: 'option3', label: 'Option 3' }
  ],
  componentProps: {}
});

// Sample radio field with options
const createSampleRadioField = (): FieldDefinition => ({
  id: uuidv4(),
  label: 'Sample Radio',
  description: 'This is a description of the radio field',
  helpText: 'This is help text for the radio field',
  component: 'radio',
  required: false,
  options: [
    { id: 'option1', label: 'Option 1' },
    { id: 'option2', label: 'Option 2' },
    { id: 'option3', label: 'Option 3' }
  ],
  componentProps: {}
});

const SampleTest: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Reset broker map on mount
  useEffect(() => {
    dispatch(resetMapFull());
    
    // Clean up when unmounted
    return () => {
      dispatch(resetMapFull());
    };
  }, [dispatch]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 text-blue-600 dark:text-blue-400">Field Component Test</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <div>
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Textarea Field</h2>
          <NewFieldRenderer field={createSampleTextareaField()} />
        </div>
        
        <div>
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Select Field</h2>
          <NewFieldRenderer field={createSampleSelectField()} />
        </div>
        
        <div>
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Radio Field</h2>
          <NewFieldRenderer field={createSampleRadioField()} />
        </div>
      </div>
    </div>
  );
};

export default SampleTest; 