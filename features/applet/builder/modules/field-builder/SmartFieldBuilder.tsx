'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { ComponentType } from '../../builder.types';
import SmartOptionsManager from './SmartOptionsManager';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { 
  selectFieldById, 
  selectFieldComponent, 
  selectFieldLabel, 
  selectFieldDescription, 
  selectFieldHelpText, 
  selectFieldPlaceholder, 
  selectFieldRequired, 
  selectFieldDisabled, 
  selectFieldIncludeOther, 
  selectFieldComponentProps 
} from '@/lib/redux/app-builder/selectors/fieldSelectors';
import { 
  setLabel, 
  setDescription, 
  setHelpText, 
  setPlaceholder, 
  setRequired, 
  setDisabled, 
  setComponent, 
  setIncludeOther, 
  setComponentProps, 
  startFieldCreation
} from '@/lib/redux/app-builder/slices/fieldBuilderSlice';

interface SmartFieldBuilderProps {
  fieldId: string;
}

export const SmartFieldBuilder: React.FC<SmartFieldBuilderProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  
  // Redux selectors for field properties
  const field = useAppSelector(state => selectFieldById(state, fieldId));
  const component = useAppSelector(state => selectFieldComponent(state, fieldId));
  const label = useAppSelector(state => selectFieldLabel(state, fieldId));
  const description = useAppSelector(state => selectFieldDescription(state, fieldId)) || '';
  const helpText = useAppSelector(state => selectFieldHelpText(state, fieldId)) || '';
  const placeholder = useAppSelector(state => selectFieldPlaceholder(state, fieldId)) || '';
  const required = useAppSelector(state => selectFieldRequired(state, fieldId)) || false;
  const disabled = useAppSelector(state => selectFieldDisabled(state, fieldId)) || false;
  const includeOther = useAppSelector(state => selectFieldIncludeOther(state, fieldId)) || false;
  const componentProps = useAppSelector(state => selectFieldComponentProps(state, fieldId)) || {};
  
  // Ensure field exists
  useEffect(() => {
    if (!field) {
      dispatch(startFieldCreation({ id: fieldId }));
    }
  }, [fieldId, field, dispatch]);
  
  if (!field) {
    return <div className="p-4">Loading field...</div>;
  }

  // Event handlers for updating field properties
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    switch (name) {
      case 'label':
        dispatch(setLabel({ id: fieldId, label: value }));
        break;
      case 'description':
        dispatch(setDescription({ id: fieldId, description: value }));
        break;
      case 'helpText':
        dispatch(setHelpText({ id: fieldId, helpText: value }));
        break;
      case 'placeholder':
        dispatch(setPlaceholder({ id: fieldId, placeholder: value }));
        break;
      default:
        break;
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'component') {
      dispatch(setComponent({ id: fieldId, component: value as ComponentType }));
    }
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    switch (name) {
      case 'required':
        dispatch(setRequired({ id: fieldId, required: checked }));
        break;
      case 'disabled':
        dispatch(setDisabled({ id: fieldId, disabled: checked }));
        break;
      case 'includeOther':
        dispatch(setIncludeOther({ id: fieldId, includeOther: checked }));
        break;
      default:
        break;
    }
  };
  
  const handleComponentPropsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? parseFloat(value) : value;
    
    dispatch(setComponentProps({
      id: fieldId,
      componentProps: {
        ...componentProps,
        [name]: newValue
      }
    }));
  };

  // Check if the component type uses options
  const hasOptions = ['select', 'multiselect', 'radio', 'checkbox'].includes(component || '');
  
  // Check if the component type can have "other" option
  const canHaveOther = ['select', 'multiselect', 'radio', 'checkbox'].includes(component || '');

  return (
    <Card className="h-full overflow-y-auto border-none bg-white dark:bg-gray-800 shadow-lg rounded-lg p-0">
      
      <div className="py-5 px-2 space-y-4">
        <div>
          <Label htmlFor="component" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Component Type
          </Label>
          <Select
            value={component || 'input'}
            onValueChange={(value) => handleSelectChange('component', value)}
          >
            <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1">
              <SelectValue placeholder="Select component type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="input">Input</SelectItem>
              <SelectItem value="textarea">Textarea</SelectItem>
              <SelectItem value="select">Select</SelectItem>
              <SelectItem value="multiselect">Multiselect</SelectItem>
              <SelectItem value="radio">Radio</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="slider">Slider</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="switch">Switch</SelectItem>
              <SelectItem value="jsonField">JSON Field</SelectItem>
              <SelectItem value="button">Button</SelectItem>
              <SelectItem value="numberPicker">Number Picker</SelectItem>
              <SelectItem value="fileUpload">File Upload</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="label" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Label
          </Label>
          <Input 
            id="label" 
            name="label" 
            value={label || ''} 
            onChange={handleTextChange}
            className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        
        <div>
          <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Description
          </Label>
          <Textarea 
            id="description" 
            name="description" 
            value={description} 
            onChange={handleTextChange}
            rows={3}
            className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        
        <div>
          <Label htmlFor="helpText" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Help Text
          </Label>
          <Textarea 
            id="helpText" 
            name="helpText" 
            value={helpText} 
            onChange={handleTextChange}
            rows={2}
            className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        
        <div>
          <Label htmlFor="placeholder" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Placeholder
          </Label>
          <Input 
            id="placeholder" 
            name="placeholder" 
            value={placeholder} 
            onChange={handleTextChange}
            className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="required" 
              checked={required} 
              onCheckedChange={(checked) => handleCheckboxChange('required', !!checked)}
              className="data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
            />
            <Label htmlFor="required" className="text-gray-800 dark:text-gray-200">
              Required
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="disabled" 
              checked={disabled} 
              onCheckedChange={(checked) => handleCheckboxChange('disabled', !!checked)}
              className="data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
            />
            <Label htmlFor="disabled" className="text-gray-800 dark:text-gray-200">
              Disabled
            </Label>
          </div>
        </div>
        
        {/* Include "Other" option checkbox for applicable component types */}
        {canHaveOther && (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeOther" 
                checked={includeOther} 
                onCheckedChange={(checked) => handleCheckboxChange('includeOther', !!checked)}
                className="data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
              />
              <Label htmlFor="includeOther" className="text-gray-800 dark:text-gray-200">
                Include "Other" option
              </Label>
            </div>
          </div>
        )}
        
        {/* Options management for select, multiselect, radio, checkbox */}
        {hasOptions && (
          <SmartOptionsManager 
            fieldId={fieldId}
          />
        )}
        
        {/* Switch component specific properties */}
        {component === 'switch' && (
          <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Switch Properties</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="onLabel" className="text-xs text-gray-700 dark:text-gray-300">
                  ON Label
                </Label>
                <Input 
                  id="onLabel" 
                  name="onLabel" 
                  value={componentProps.onLabel || 'Yes'} 
                  onChange={handleComponentPropsChange}
                  className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Yes"
                />
              </div>
              <div>
                <Label htmlFor="offLabel" className="text-xs text-gray-700 dark:text-gray-300">
                  OFF Label
                </Label>
                <Input 
                  id="offLabel" 
                  name="offLabel" 
                  value={componentProps.offLabel || 'No'} 
                  onChange={handleComponentPropsChange}
                  className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="No"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Component-specific properties based on the type */}
        {(component === 'slider' || component === 'number') && (
          <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Range Properties</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="min" className="text-xs text-gray-700 dark:text-gray-300">
                  Min
                </Label>
                <Input 
                  type="number" 
                  id="min" 
                  name="min" 
                  value={componentProps.min} 
                  onChange={handleComponentPropsChange}
                  className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label htmlFor="max" className="text-xs text-gray-700 dark:text-gray-300">
                  Max
                </Label>
                <Input 
                  type="number" 
                  id="max" 
                  name="max" 
                  value={componentProps.max} 
                  onChange={handleComponentPropsChange}
                  className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label htmlFor="step" className="text-xs text-gray-700 dark:text-gray-300">
                  Step
                </Label>
                <Input 
                  type="number" 
                  id="step" 
                  name="step" 
                  value={componentProps.step} 
                  onChange={handleComponentPropsChange}
                  className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>
        )}
        
        {component === 'textarea' && (
          <div>
            <Label htmlFor="rows" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Rows
            </Label>
            <Input 
              type="number" 
              id="rows" 
              name="rows" 
              value={componentProps.rows} 
              onChange={handleComponentPropsChange}
              className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        )}
        
        {component === 'date' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minDate" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Min Date
              </Label>
              <Input 
                type="date" 
                id="minDate" 
                name="minDate" 
                value={componentProps.minDate || ''} 
                onChange={handleComponentPropsChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="maxDate" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Max Date
              </Label>
              <Input 
                type="date" 
                id="maxDate" 
                name="maxDate" 
                value={componentProps.maxDate || ''} 
                onChange={handleComponentPropsChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SmartFieldBuilder; 