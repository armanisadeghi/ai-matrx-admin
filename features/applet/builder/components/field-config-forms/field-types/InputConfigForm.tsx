import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InputFieldConfig } from '../../../../runner/components/field-components/types';

interface InputConfigFormProps {
  config: Partial<InputFieldConfig>;
  onChange: (config: Partial<InputFieldConfig>) => void;
}

export const InputConfigForm: React.FC<InputConfigFormProps> = ({
  config,
  onChange
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    // For number inputs, convert value to number
    const updatedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    onChange({ ...config, [name]: updatedValue });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    onChange({ ...config, [name]: checked });
  };

  const handleSelectChange = (name: string, value: string) => {
    onChange({ ...config, [name]: value });
  };

  const inputTypes = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'password', label: 'Password' },
    { value: 'url', label: 'URL' },
    { value: 'tel', label: 'Phone' },
    { value: 'search', label: 'Search' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Input Type
          </Label>
          <Select
            value={config.type || 'text'}
            onValueChange={(value) => handleSelectChange('type', value)}
          >
            <SelectTrigger id="type" className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              <SelectValue placeholder="Select input type" />
            </SelectTrigger>
            <SelectContent>
              {inputTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Type of input field
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pattern" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Validation Pattern
          </Label>
          <Input
            id="pattern"
            name="pattern"
            placeholder="e.g. [A-Za-z]+"
            value={config.pattern || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-mono text-sm"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Regular expression pattern for validation
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="autocomplete" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Autocomplete
          </Label>
          <Input
            id="autocomplete"
            name="autoComplete"
            placeholder="e.g. name, email, tel"
            value={config.autoComplete || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Autocomplete attribute for browsers
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="inputClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Custom CSS Class
          </Label>
          <Input
            id="inputClassName"
            name="inputClassName"
            placeholder="e.g. custom-input"
            value={config.inputClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Additional CSS class for styling
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subtitle" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Subtitle
          </Label>
          <Input
            id="subtitle"
            name="subtitle"
            placeholder="Optional subtitle"
            value={config.subtitle || ''}
            onChange={handleChange}
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
            name="helpText"
            placeholder="Optional help text"
            value={config.helpText || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Helpful text displayed below the field
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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