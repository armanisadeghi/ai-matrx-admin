import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MultiSelectFieldConfig } from '../../../../../runner/components/field-components/types';

interface SettingsTabProps {
  config: Partial<MultiSelectFieldConfig>;
  onChange: (config: Partial<MultiSelectFieldConfig>) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  onChange
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const updatedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    onChange({ ...config, [name]: updatedValue });
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    onChange({ ...config, [name]: checked });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="maxItems" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Max Selected Items
          </Label>
          <Input
            id="maxItems"
            name="maxItems"
            type="number"
            placeholder="e.g. 5 (leave empty for unlimited)"
            value={config.maxItems === undefined ? '' : config.maxItems}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Maximum number of items that can be selected
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="maxHeight" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Max Height
          </Label>
          <Input
            id="maxHeight"
            name="maxHeight"
            placeholder="e.g. 300px"
            value={config.maxHeight || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Maximum height of the dropdown menu
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="showSearch" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Show Search
            </Label>
            <Switch
              id="showSearch"
              checked={config.showSearch || false}
              onCheckedChange={(checked) => handleSwitchChange('showSearch', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Enable search functionality
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="searchPlaceholder" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Search Placeholder
          </Label>
          <Input
            id="searchPlaceholder"
            name="searchPlaceholder"
            placeholder="e.g. Search options..."
            value={config.searchPlaceholder || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Placeholder text for the search input
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="createNewOption" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Create New Options
            </Label>
            <Switch
              id="createNewOption"
              checked={config.createNewOption || false}
              onCheckedChange={(checked) => handleSwitchChange('createNewOption', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Allow users to create new options
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="createNewMessage" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Create New Message
          </Label>
          <Input
            id="createNewMessage"
            name="createNewMessage"
            placeholder='e.g. Create "{input}"'
            value={config.createNewMessage || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Message shown when creating a new option
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="showSelectAll" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Show Select All
            </Label>
            <Switch
              id="showSelectAll"
              checked={config.showSelectAll || false}
              onCheckedChange={(checked) => handleSwitchChange('showSelectAll', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Show option to select all items
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="allowClear" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Allow Clear
            </Label>
            <Switch
              id="allowClear"
              checked={config.allowClear || false}
              onCheckedChange={(checked) => handleSwitchChange('allowClear', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Show button to clear all selections
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;