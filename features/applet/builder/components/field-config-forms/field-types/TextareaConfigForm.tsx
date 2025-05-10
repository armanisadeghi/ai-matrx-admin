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
import { TextareaFieldConfig } from '../../../../a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/types';

interface TextareaConfigFormProps {
  config: Partial<TextareaFieldConfig>;
  onChange: (config: Partial<TextareaFieldConfig>) => void;
}

export const TextareaConfigForm: React.FC<TextareaConfigFormProps> = ({
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rows" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Number of Rows
          </Label>
          <Input
            id="rows"
            name="rows"
            type="number"
            placeholder="e.g. 3"
            value={config.rows || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Default height of the textarea
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="maxLength" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Maximum Length
          </Label>
          <Input
            id="maxLength"
            name="maxLength"
            type="number"
            placeholder="e.g. 500"
            value={config.maxLength || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Maximum number of characters allowed
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="resize" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Resize Behavior
          </Label>
          <Select
            value={config.resize || 'vertical'}
            onValueChange={(value) => handleSelectChange('resize', value)}
          >
            <SelectTrigger id="resize" className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              <SelectValue placeholder="Select resize behavior" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Controls how the textarea can be resized
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="textareaClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Custom CSS Class
          </Label>
          <Input
            id="textareaClassName"
            name="textareaClassName"
            placeholder="e.g. custom-textarea"
            value={config.textareaClassName || ''}
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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