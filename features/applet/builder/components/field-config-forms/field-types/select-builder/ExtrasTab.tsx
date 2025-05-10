import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelectFieldConfig } from '../../../../../a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/types';


interface ExtrasTabProps {
  config: Partial<MultiSelectFieldConfig>;
  onChange: (config: Partial<MultiSelectFieldConfig>) => void;
}

export const ExtrasTab: React.FC<ExtrasTabProps> = ({
  config,
  onChange
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const updatedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    onChange({ ...config, [name]: updatedValue });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="emptyMessage" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Empty Message
          </Label>
          <Input
            id="emptyMessage"
            name="emptyMessage"
            placeholder="e.g. No options available"
            value={config.emptyMessage || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Message to display when no options are available
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="chipClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Chip Class Name
          </Label>
          <Input
            id="chipClassName"
            name="chipClassName"
            placeholder="e.g. bg-blue-100 text-blue-800 dark:bg-blue-800..."
            value={config.chipClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for the selected item chips
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="dropdownClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Dropdown Class Name
          </Label>
          <Input
            id="dropdownClassName"
            name="dropdownClassName"
            placeholder="e.g. mt-1 border border-zinc-200 dark:border-zinc-700..."
            value={config.dropdownClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for the dropdown menu
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customClass" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Custom Component Class
          </Label>
          <Input
            id="customClass"
            name="customClass"
            placeholder="e.g. my-multiselect rounded-lg shadow-sm..."
            value={config.customClass || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Additional CSS classes for the entire component
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="emptyIconClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Empty Icon Class Name
          </Label>
          <Input
            id="emptyIconClassName"
            name="emptyIconClassName"
            placeholder="e.g. text-zinc-400 h-8 w-8..."
            value={config.emptyIconClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Styling for the empty state icon
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="errorMessageClass" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Error Message Class
          </Label>
          <Input
            id="errorMessageClass"
            name="errorMessageClass"
            placeholder="e.g. text-red-500 text-sm mt-1..."
            value={config.errorMessageClass || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for error messages
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="animationDuration" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Animation Duration (ms)
          </Label>
          <Input
            id="animationDuration"
            name="animationDuration"
            type="number"
            placeholder="e.g. 200"
            value={config.animationDuration === undefined ? '' : config.animationDuration}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Duration of dropdown animations in milliseconds
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="testId" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Test ID
          </Label>
          <Input
            id="testId"
            name="testId"
            placeholder="e.g. multi-select-categories"
            value={config.testId || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Identifier for automated testing
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExtrasTab;