import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComponentType } from '@/types/customAppTypes';
import { 
  InputConfigForm,
  TextareaConfigForm,
  SelectConfigForm,
  ButtonConfigForm,
  NumberConfigForm,
  CheckboxConfigForm,
  RadioConfigForm,
  SliderConfigForm,
  MultiSelectConfigForm,
} from './field-types';
import { GroupFieldConfig } from '@/features/applet/runner/field-components/types';

interface FieldConfigFormsProps {
  // Support both type and fieldType for backward compatibility
  type?: ComponentType | GroupFieldConfig['type'];
  fieldType?: ComponentType | GroupFieldConfig['type'];
  config: any;
  onChange: (config: any) => void;
}

export const FieldConfigForms: React.FC<FieldConfigFormsProps> = ({
  type, // Keep for backward compatibility
  fieldType,
  config,
  onChange
}) => {
  // Use fieldType if provided, otherwise use type
  const componentType = fieldType || type || 'input';
  
  switch (componentType) {
    case 'input':
      return <InputConfigForm config={config} onChange={onChange} />;
    
    case 'textarea':
      return <TextareaConfigForm config={config} onChange={onChange} />;
      
    case 'select':
      return <SelectConfigForm config={config} onChange={onChange} />;
      
    case 'button':
      return <ButtonConfigForm config={config} onChange={onChange} />;
      
    case 'number':
      return <NumberConfigForm config={config} onChange={onChange} />;
      
    case 'checkbox':
      return <CheckboxConfigForm config={config} onChange={onChange} />;
      
    case 'radio':
      return <RadioConfigForm config={config} onChange={onChange} />;
      
    case 'slider':
      return <SliderConfigForm config={config} onChange={onChange} />;
      
    case 'multiselect':
      return <MultiSelectConfigForm config={config} onChange={onChange} />;
      
    case 'date':
      // For simple fields like date, we can use a common form with basic fields
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtitle" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Subtitle
              </Label>
              <Input
                id="subtitle"
                placeholder="Optional subtitle"
                value={config.subtitle || ''}
                onChange={(e) => onChange({ ...config, subtitle: e.target.value })}
                className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Additional text displayed below the label
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="helpText" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Help Text
              </Label>
              <Input
                id="helpText"
                placeholder="Optional help text"
                value={config.helpText || ''}
                onChange={(e) => onChange({ ...config, helpText: e.target.value })}
                className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Helpful text displayed below the field
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="width" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Width
              </Label>
              <Select
                value={config.width || 'w-full'}
                onValueChange={(value) => onChange({ ...config, width: value })}
              >
                <SelectTrigger id="width" className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                  <SelectValue placeholder="Select width" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="w-full">Full width</SelectItem>
                  <SelectItem value="w-auto">Auto width</SelectItem>
                  <SelectItem value="w-1/2">Half width</SelectItem>
                  <SelectItem value="w-1/3">One-third width</SelectItem>
                  <SelectItem value="w-2/3">Two-thirds width</SelectItem>
                  <SelectItem value="w-1/4">Quarter width</SelectItem>
                  <SelectItem value="w-3/4">Three-quarters width</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Controls the width of the field container
              </p>
            </div>
          </div>
        </div>
      );
      
    default:
      return (
        <div className="p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-md">
          <p className="text-amber-800 dark:text-amber-400">
            No specific configuration options available for this field type.
          </p>
        </div>
      );
  }
}; 