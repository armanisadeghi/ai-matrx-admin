import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectFieldConfig } from '../../../../../a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/types';

interface FieldFormConfig {
  id?: string;
  label?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string | string[];
  width?: string;
  customConfig?: Partial<MultiSelectFieldConfig>;
}

interface IdentificationTabProps {
  config: FieldFormConfig;
  onChange: (config: FieldFormConfig) => void;
}

export const IdentificationTab: React.FC<IdentificationTabProps> = ({
  config,
  onChange
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const updatedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    onChange({ ...config, [name]: updatedValue });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    onChange({ ...config, [name]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="label" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Field Label
          </Label>
          <Input
            id="label"
            name="label"
            placeholder="e.g. Select Categories"
            value={config.label || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            The main label shown above the field
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Field Name
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. categories"
            value={config.name || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            The field name used in form submissions
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="id" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Field ID
          </Label>
          <Input
            id="id"
            name="id"
            placeholder="e.g. categories-select"
            value={config.id || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Unique identifier for the field
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="placeholder" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Placeholder
          </Label>
          <Input
            id="placeholder"
            name="placeholder"
            placeholder="e.g. Select items..."
            value={config.placeholder || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Text displayed when no items are selected
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="defaultValue" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Default Value(s)
          </Label>
          <Input
            id="defaultValue"
            name="defaultValue"
            placeholder="e.g. option-1,option-2"
            value={Array.isArray(config.defaultValue) ? config.defaultValue.join(',') : config.defaultValue || ''}
            onChange={(e) => {
              const value = e.target.value;
              onChange({ ...config, defaultValue: value ? value.split(',') : [] });
            }}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Comma-separated list of default selected values
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="width" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Width
          </Label>
          <Select
            value={config.width || 'w-full'}
            onValueChange={(value) => handleSelectChange('width', value)}
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
};

export default IdentificationTab;